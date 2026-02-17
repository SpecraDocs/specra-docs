import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { logAudit } from '$lib/server/audit.js';

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { installationId, repo, branch } = await request.json();

  if (!installationId || !repo) {
    return json(
      { error: 'installationId and repo are required' },
      { status: 400 }
    );
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      githubInstallId: installationId,
      githubRepo: repo,
      githubBranch: branch || 'main',
    },
  });

  logAudit({
    userId: session.user.id,
    action: 'PROJECT.GITHUB_CONNECT',
    target: projectId,
    metadata: { repo, branch: branch || 'main' },
  });

  return json(project);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      githubInstallId: null,
      githubRepo: null,
      githubBranch: 'main',
    },
  });

  logAudit({
    userId: session.user.id,
    action: 'PROJECT.GITHUB_DISCONNECT',
    target: projectId,
    metadata: {},
  });

  return json(project);
};
