import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { getPlatformTraffic } from '$lib/server/admin-stats.js';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const [traffic30d, traffic7d, topProjects] = await Promise.all([
    getPlatformTraffic(30),
    getPlatformTraffic(7),
    prisma.analyticsEvent.groupBy({
      by: ['projectId'],
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        duration: null,
      },
      _count: true,
      orderBy: { _count: { projectId: 'desc' } },
      take: 10,
    }),
  ]);

  // Resolve project names
  const projectIds = topProjects.map((t) => t.projectId);
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, subdomain: true },
  });
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return json({
    last30Days: traffic30d,
    last7Days: traffic7d,
    topProjects: topProjects.map((t) => ({
      project: projectMap.get(t.projectId),
      views: t._count,
    })),
  });
};
