import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { resolveUserId } from '$lib/server/api-auth.js';

export const GET: RequestHandler = async ({ locals, request, params }) => {
  const userId = await resolveUserId(locals, request);
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, deploymentId } = params;

  if (!(await canAccessProject(userId, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
  });

  if (!deployment || deployment.projectId !== projectId) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json(deployment);
};
