import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const members = await prisma.organizationMember.findMany({
    where: { orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return json(members);
};
