import { prisma } from "./db.js"

export function logAudit(params: {
  userId?: string | null
  orgId?: string | null
  action: string
  target?: string | null
  metadata?: Record<string, unknown> | null
}) {
  // Fire-and-forget — don't block the request on audit log writes
  prisma.auditLog.create({
    data: {
      action: params.action,
      userId: params.userId ?? undefined,
      orgId: params.orgId ?? undefined,
      target: params.target ?? undefined,
      metadata: (params.metadata as any) ?? undefined,
    },
  }).catch((err) => {
    console.error("Audit log failed:", err)
  })
}
