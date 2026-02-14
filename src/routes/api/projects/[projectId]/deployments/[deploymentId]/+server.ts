import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { getContainerLogs } from '$lib/server/docker.js';

export const GET: RequestHandler = async ({ locals, params }) => {
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
  });

  if (!deployment || deployment.projectId !== projectId) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  let containerLogs = '';
  if (deployment.containerId && deployment.status === 'RUNNING') {
    containerLogs = await getContainerLogs(deployment.containerId);
  }

  return json({ ...deployment, containerLogs });
};
