import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const { projectId } = params;
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;

  if (!(await canAccessProject(session.user.id, projectId))) {
    error(404, 'Not found');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) error(404, 'Not found');

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deployment.count({ where: { projectId } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    project: { id: project.id, name: project.name },
    deployments: deployments.map((d) => ({
      id: d.id,
      status: d.status,
      trigger: d.trigger,
      commitSha: d.commitSha,
      createdAt: d.createdAt.toISOString(),
    })),
    page,
    totalPages,
  };
};
