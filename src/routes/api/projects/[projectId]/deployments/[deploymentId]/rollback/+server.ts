import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canDeploy } from '$lib/server/permissions.js';
import { getVersionHistoryLimit } from '$lib/server/permissions.js';
import { deployProject } from '$lib/server/deploy.js';
import { readFile } from 'fs/promises';
import path from 'path';

const PROJECTS_DIR = process.env.PROJECTS_DATA_DIR || '/data/specra/projects';

export const POST: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, deploymentId } = params;

  if (!(await canDeploy(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
  });

  if (!deployment || deployment.projectId !== projectId) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  if (!deployment.archivePath) {
    return json({ error: 'No archive available for this deployment' }, { status: 400 });
  }

  // Verify deployment is within retention window
  const { cutoffDate } = await getVersionHistoryLimit(session.user.id);
  if (cutoffDate && deployment.createdAt < cutoffDate) {
    return json({ error: 'Deployment is outside your plan retention window' }, { status: 403 });
  }

  // Read saved archive from disk
  const archivePath = path.join(PROJECTS_DIR, projectId, deployment.archivePath);
  let docsContent: Buffer;
  try {
    docsContent = await readFile(archivePath);
  } catch {
    return json({ error: 'Archive file not found on disk' }, { status: 404 });
  }

  // Create a new deployment from the saved archive
  const newDeploymentId = await deployProject(projectId, {
    docsContent,
    trigger: 'MANUAL',
    commitSha: deployment.commitSha ?? undefined,
  });

  return json({ deploymentId: newDeploymentId }, { status: 202 });
};
