import { NextRequest } from "next/server"
import { createHash } from "crypto"
import { prisma } from "@/lib/db"

export async function authenticateApiRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.slice(7)
  const tokenHash = createHash("sha256").update(token).digest("hex")

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!apiToken) return null

  // Check expiry
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    return null
  }

  // Update lastUsed
  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsed: new Date() },
  })

  return apiToken.user
}
