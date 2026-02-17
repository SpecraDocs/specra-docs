import { prisma } from "./db.js"
import type { ChatSenderType, ChatStatus } from "@prisma/client"

export async function createConversation(
  projectId: string,
  visitorId: string,
  visitorName?: string,
  visitorEmail?: string
) {
  return prisma.chatConversation.create({
    data: {
      projectId,
      visitorId,
      visitorName: visitorName || null,
      visitorEmail: visitorEmail || null,
    },
  })
}

export async function sendMessage(
  conversationId: string,
  senderType: ChatSenderType,
  senderId: string | null,
  content: string
) {
  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderType,
      senderId,
      content,
    },
  })

  // Update conversation updatedAt
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  return message
}

export async function getConversations(
  projectId: string,
  status?: ChatStatus,
  cursor?: string,
  limit = 50
) {
  return prisma.chatConversation.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    ...(cursor
      ? { skip: 1, cursor: { id: cursor } }
      : {}),
  })
}

export async function getMessages(
  conversationId: string,
  cursor?: string,
  limit = 50
) {
  return prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor
      ? { skip: 1, cursor: { id: cursor } }
      : {}),
  })
}

export async function closeConversation(conversationId: string) {
  return prisma.chatConversation.update({
    where: { id: conversationId },
    data: { status: "CLOSED" },
  })
}

export async function getAllConversations(cursor?: string, limit = 50) {
  return prisma.chatConversation.findMany({
    include: {
      project: {
        select: { id: true, name: true, userId: true, user: { select: { name: true, email: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    ...(cursor
      ? { skip: 1, cursor: { id: cursor } }
      : {}),
  })
}
