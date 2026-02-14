import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const deployments = await prisma.deployment.findMany({
    where: { status: { in: ['RUNNING', 'BUILDING', 'DEPLOYING', 'QUEUED'] } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          subdomain: true,
          user: { select: { id: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return json(deployments);
};
