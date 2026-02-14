import { prisma } from "./db.js"
import type { UserRole } from "@prisma/client"

export async function getUserSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })
  return subscription
}

export async function getUserWithSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
  return user
}

export function getPlanFeatures(plan: { features: unknown }) {
  return (plan.features as Record<string, unknown>) ?? {}
}

export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return memberships
}

export async function canAccessProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: { include: { members: true } } },
  })
  if (!project) return false

  if (project.userId === userId) return true

  if (project.organization) {
    return project.organization.members.some((m) => m.userId === userId)
  }

  return false
}
