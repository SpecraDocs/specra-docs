import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { sendMessage } from '$lib/server/chat.js';

export const GET: RequestHandler = async ({ locals, params, url }) => {
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

  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: params.conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  return json({ messages });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
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

  const { content } = await request.json();

  if (!content || typeof content !== 'string') {
    return json({ error: 'content is required' }, { status: 400 });
  }

  const message = await sendMessage(
    params.conversationId,
    'OWNER',
    session.user.id,
    content
  );

  return json({ message });
};
