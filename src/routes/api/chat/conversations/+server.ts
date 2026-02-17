import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = url.searchParams.get('status') as 'OPEN' | 'CLOSED' | null;
  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  // Get all projects owned by the user
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const projectIds = projects.map((p) => p.id);

  const conversations = await prisma.chatConversation.findMany({
    where: {
      projectId: { in: projectIds },
      ...(status ? { status } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  return json({ conversations });
};
