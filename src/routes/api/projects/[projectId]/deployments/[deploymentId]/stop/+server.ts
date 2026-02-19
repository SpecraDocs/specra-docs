import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { removeRoute } from '$lib/server/caddy.js';
import { logAudit } from '$lib/server/audit.js';
import { unlink } from 'fs/promises';
import path from 'path';

const SITES_DIR = process.env.SITES_DIR || '/var/www/sites';

export const POST: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, deploymentId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: true },
  });

  if (!deployment || deployment.projectId !== projectId) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  if (deployment.status !== 'RUNNING') {
    return json(
      { error: 'Deployment is not running' },
      { status: 400 }
    );
  }

  // Remove Caddy routes
  await removeRoute(`specra-${deployment.project.subdomain}`);
  if (deployment.project.customDomain) {
    await removeRoute(
      `specra-custom-${deployment.project.customDomain.replace(/\./g, '-')}`
    );
  }

  // Remove current symlink so Caddy returns 404
  const currentLink = path.join(SITES_DIR, deployment.project.subdomain, 'current');
  try {
    await unlink(currentLink);
  } catch {
    // Symlink may not exist
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'STOPPED' },
  });

  logAudit({
    userId: session.user.id,
    action: 'DEPLOYMENT.STOP',
    target: deploymentId,
    metadata: { projectId },
  });

  return json({ success: true });
};
