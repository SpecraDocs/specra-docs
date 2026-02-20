import { createHash } from "crypto"
import { prisma } from "./db.js"

/**
 * Resolve user ID from session auth (browser) or API token auth (CLI).
 * Tries session first, falls back to Bearer token.
 */
export async function resolveUserId(
  locals: App.Locals,
  request: Request
): Promise<string | null> {
  const session = await locals.auth()
  if (session?.user?.id) return session.user.id

  const apiUser = await authenticateApiRequest(request.headers.get("authorization"))
  if (apiUser) return apiUser.id

  return null
}

export async function authenticateApiRequest(authHeader: string | null) {
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
