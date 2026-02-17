import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { isAdmin } from '$lib/server/permissions.js';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: params.conversationId },
    include: {
      project: {
        select: { id: true, name: true, userId: true, user: { select: { name: true, email: true } } },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json({ conversation });
};
