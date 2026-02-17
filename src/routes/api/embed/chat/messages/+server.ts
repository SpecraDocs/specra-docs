import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ url }) => {
  const conversationId = url.searchParams.get('conversationId');
  const visitorId = url.searchParams.get('visitorId');

  if (!conversationId || !visitorId) {
    return json({ messages: [] }, { headers: corsHeaders });
  }

  // Verify the visitor owns this conversation
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { visitorId: true },
  });

  if (!conversation || conversation.visitorId !== visitorId) {
    return json({ messages: [] }, { headers: corsHeaders });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return json({ messages }, { headers: corsHeaders });
};
