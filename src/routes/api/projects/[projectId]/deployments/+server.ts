import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';

export const GET: RequestHandler = async ({ locals, url, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const skip = (page - 1) * limit;

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deployment.count({ where: { projectId } }),
  ]);

  return json({
    deployments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};
