import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const projectIds = projects.map((p) => p.id);

  const conversations = await prisma.chatConversation.findMany({
    where: { projectId: { in: projectIds } },
    include: {
      project: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  return {
    conversations: conversations.map((c: typeof conversations[number]) => ({
      id: c.id,
      projectId: c.projectId,
      projectName: c.project.name,
      visitorId: c.visitorId,
      visitorName: c.visitorName,
      visitorEmail: c.visitorEmail,
      status: c.status,
      messageCount: c._count.messages,
      lastMessage: c.messages[0]?.content || null,
      lastMessageAt: c.messages[0]?.createdAt?.toISOString() || null,
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
};
