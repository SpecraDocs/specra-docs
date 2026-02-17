import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: params.conversationId },
    include: {
      project: { select: { id: true, name: true, userId: true } },
      _count: { select: { messages: true } },
    },
  });

  if (!conversation) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  // Verify ownership
  if (conversation.project.userId !== session.user.id) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  return json({ conversation });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: params.conversationId },
    include: { project: { select: { userId: true } } },
  });

  if (!conversation) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  if (conversation.project.userId !== session.user.id) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { status } = await request.json();

  if (status !== 'OPEN' && status !== 'CLOSED') {
    return json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await prisma.chatConversation.update({
    where: { id: params.conversationId },
    data: { status },
  });

  return json({ conversation: updated });
};
