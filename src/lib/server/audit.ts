import { prisma } from "./db.js"

export function logAudit(params: {
  userId?: string | null
  orgId?: string | null
  action: string
  target?: string | null
  metadata?: Record<string, unknown> | null
}) {
  // Fire-and-forget — don't block the request on audit log writes
  prisma.auditLog.create({ data: params }).catch((err) => {
    console.error("Audit log failed:", err)
  })
}
