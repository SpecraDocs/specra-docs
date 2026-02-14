import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '$lib/server/db.js';
import { getInstallationToken, cloneRepository } from '$lib/server/github.js';
import { deployProject } from '$lib/server/deploy.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as tar from 'tar';

const PROJECTS_DIR = process.env.PROJECTS_DATA_DIR || '/data/specra/projects';

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = `sha256=${createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256') || '';
  const event = request.headers.get('x-github-event');

  // Verify webhook signature
  if (!verifySignature(body, signature)) {
    return json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  if (event !== 'push') {
    return json({ ok: true });
  }

  const payload = JSON.parse(body);
  const installationId = payload.installation?.id;
  const repoFullName = payload.repository?.full_name;
  const branch = payload.ref?.replace('refs/heads/', '');
  const commitSha = payload.after;

  if (!installationId || !repoFullName || !branch) {
    return json({ ok: true });
  }

  // Find matching project
  const project = await prisma.project.findFirst({
    where: {
      githubInstallId: installationId,
      githubRepo: repoFullName,
      githubBranch: branch,
    },
  });

  if (!project) {
    return json({ ok: true, message: 'No matching project' });
  }

  // Clone and deploy in background
  try {
    const token = await getInstallationToken(installationId);
    const cloneDir = join(PROJECTS_DIR, project.id, 'github-clone');

    await cloneRepository(
      `https://github.com/${repoFullName}`,
      branch,
      token,
      cloneDir
    );

    // Create tar.gz from the clone
    const chunks: Buffer[] = [];
    await tar
      .create({ gzip: true, cwd: cloneDir }, ['.'])
      .on('data', (chunk: Buffer) => chunks.push(chunk));

    const archive = Buffer.concat(chunks);

    let configJson: string | undefined;
    try {
      configJson = readFileSync(
        join(cloneDir, 'specra.config.json'),
        'utf-8'
      );
    } catch {
      // no config
    }

    await deployProject(project.id, {
      docsContent: archive,
      configJson,
      trigger: 'GITHUB',
      commitSha,
    });
  } catch (err) {
    console.error(`GitHub deploy failed for ${project.id}:`, err);
  }

  return json({ ok: true });
};
