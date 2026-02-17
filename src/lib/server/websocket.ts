import { WebSocketServer, WebSocket } from "ws"
import type { IncomingMessage } from "http"
import type { Duplex } from "stream"
import { prisma } from "./db.js"
import { sendMessage } from "./chat.js"
import jwt from "jsonwebtoken"

const AUTH_SECRET = process.env.AUTH_SECRET || ""

// Connection maps
const visitorConnections = new Map<string, WebSocket>() // conversationId -> ws
const ownerConnections = new Map<string, Set<WebSocket>>() // projectId -> Set<ws>

const wss = new WebSocketServer({ noServer: true })

interface WsMessage {
  type: "message" | "join" | "close" | "typing" | "ping"
  conversationId?: string
  content?: string
}

export function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
  const url = new URL(request.url || "", `http://${request.headers.host}`)
  const pathname = url.pathname

  if (!pathname.startsWith("/ws/chat/")) {
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    if (pathname === "/ws/chat/visitor") {
      handleVisitorConnection(ws, url)
    } else if (pathname === "/ws/chat/owner") {
      handleOwnerConnection(ws, url)
    } else {
      ws.close(4000, "Unknown path")
    }
  })
}

async function handleVisitorConnection(ws: WebSocket, url: URL) {
  const projectId = url.searchParams.get("projectId")
  const visitorId = url.searchParams.get("visitorId")
  const conversationId = url.searchParams.get("conversationId")

  if (!projectId || !visitorId || !conversationId) {
    ws.close(4001, "Missing parameters")
    return
  }

  // Validate project exists and chat is enabled
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { chatEnabled: true },
  })

  if (!project || !project.chatEnabled) {
    ws.close(4002, "Chat not available")
    return
  }

  visitorConnections.set(conversationId, ws)

  ws.on("message", async (raw) => {
    try {
      const data: WsMessage = JSON.parse(raw.toString())

      if (data.type === "ping") return

      if (data.type === "message" && data.content) {
        const message = await sendMessage(conversationId, "VISITOR", visitorId, data.content)

        // Forward to project owner
        const ownerSockets = ownerConnections.get(projectId)
        if (ownerSockets) {
          const payload = JSON.stringify({
            type: "message",
            conversationId,
            senderType: "VISITOR",
            senderId: visitorId,
            content: data.content,
            messageId: message.id,
            createdAt: message.createdAt.toISOString(),
          })
          ownerSockets.forEach((ownerWs) => {
            if (ownerWs.readyState === WebSocket.OPEN) {
              ownerWs.send(payload)
            }
          })
        }
      }
    } catch {}
  })

  ws.on("close", () => {
    visitorConnections.delete(conversationId)
  })

  // Heartbeat
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping()
    } else {
      clearInterval(pingInterval)
    }
  }, 30000)

  ws.on("close", () => clearInterval(pingInterval))
}

async function handleOwnerConnection(ws: WebSocket, url: URL) {
  const token = url.searchParams.get("token")

  if (!token) {
    ws.close(4001, "Missing token")
    return
  }

  // Validate JWT token
  let userId: string
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as { sub?: string; id?: string }
    userId = decoded.sub || decoded.id || ""
    if (!userId) throw new Error("No user ID in token")
  } catch {
    ws.close(4003, "Invalid token")
    return
  }

  // Get all projects owned by this user
  const projects = await prisma.project.findMany({
    where: { userId, chatEnabled: true },
    select: { id: true },
  })

  const projectIds = projects.map((p) => p.id)

  // Register for all projects
  for (const pid of projectIds) {
    if (!ownerConnections.has(pid)) {
      ownerConnections.set(pid, new Set())
    }
    ownerConnections.get(pid)!.add(ws)
  }

  ws.on("message", async (raw) => {
    try {
      const data: WsMessage = JSON.parse(raw.toString())

      if (data.type === "ping") return

      if (data.type === "message" && data.conversationId && data.content) {
        const message = await sendMessage(data.conversationId, "OWNER", userId, data.content)

        // Find the conversation to get projectId
        const conv = await prisma.chatConversation.findUnique({
          where: { id: data.conversationId },
          select: { projectId: true },
        })

        if (conv) {
          // Forward to visitor
          const visitorWs = visitorConnections.get(data.conversationId)
          if (visitorWs && visitorWs.readyState === WebSocket.OPEN) {
            visitorWs.send(JSON.stringify({
              type: "message",
              conversationId: data.conversationId,
              senderType: "OWNER",
              content: data.content,
              messageId: message.id,
              createdAt: message.createdAt.toISOString(),
            }))
          }
        }
      }

      if (data.type === "close" && data.conversationId) {
        await prisma.chatConversation.update({
          where: { id: data.conversationId },
          data: { status: "CLOSED" },
        })

        const visitorWs = visitorConnections.get(data.conversationId)
        if (visitorWs && visitorWs.readyState === WebSocket.OPEN) {
          visitorWs.send(JSON.stringify({ type: "close", conversationId: data.conversationId }))
        }
      }
    } catch {}
  })

  ws.on("close", () => {
    for (const pid of projectIds) {
      ownerConnections.get(pid)?.delete(ws)
      if (ownerConnections.get(pid)?.size === 0) {
        ownerConnections.delete(pid)
      }
    }
  })

  // Heartbeat
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping()
    } else {
      clearInterval(pingInterval)
    }
  }, 30000)

  ws.on("close", () => clearInterval(pingInterval))
}
