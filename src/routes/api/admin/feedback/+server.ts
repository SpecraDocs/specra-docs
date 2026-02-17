import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { isAdmin } from '$lib/server/permissions.js';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');

  const where: Record<string, unknown> = {};
  if (status === 'OPEN' || status === 'RESOLVED') where.status = status;
  if (type === 'FEEDBACK' || type === 'ISSUE') where.type = type;

  const items = await prisma.feedbackItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, name: true, user: { select: { name: true, email: true } } } },
      resolver: { select: { id: true, name: true, email: true } },
    },
  });

  return json({ items });
};
