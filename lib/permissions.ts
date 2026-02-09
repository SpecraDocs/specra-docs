import { prisma } from "@/lib/db"
import { getUserSubscription } from "@/lib/auth-utils"

const PLAN_LIMITS: Record<string, { maxProjects: number; maxSeats: number }> = {
  free: { maxProjects: 1, maxSeats: 1 },
  starter: { maxProjects: 3, maxSeats: 3 },
  pro: { maxProjects: 10, maxSeats: 10 },
  enterprise: { maxProjects: Infinity, maxSeats: Infinity },
}

export async function canDeploy(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: { include: { members: true } } },
  })
  if (!project) return false

  // Check ownership or org membership
  const isOwner = project.userId === userId
  const isOrgMember = project.organization?.members.some(
    (m) => m.userId === userId
  )
  if (!isOwner && !isOrgMember) return false

  // Admins can always deploy
  if (await isAdmin(userId)) return true

  // Check plan limits
  const limits = await checkPlanLimits(userId)
  return limits.canDeploy
}

export async function canViewAnalytics(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { organization: { include: { members: true } } },
  })
  if (!project) return false

  const isOwner = project.userId === userId
  const isOrgMember = project.organization?.members.some(
    (m) => m.userId === userId
  )
  if (!isOwner && !isOrgMember) return false

  // Admins can always view analytics
  if (await isAdmin(userId)) return true

  // Analytics requires Starter+ plan
  const subscription = await getUserSubscription(userId)
  if (!subscription) return false
  const slug = subscription.plan.slug
  return slug === "starter" || slug === "pro" || slug === "enterprise"
}

export async function isAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === "ADMIN"
}

export async function checkPlanLimits(userId: string) {
  const projectCount = await prisma.project.count({ where: { userId } })

  // Admins have unlimited access
  if (await isAdmin(userId)) {
    return {
      planSlug: "admin",
      maxProjects: Infinity,
      maxSeats: Infinity,
      currentProjects: projectCount,
      canDeploy: true,
      canCreateProject: true,
    }
  }

  const subscription = await getUserSubscription(userId)
  const planSlug = subscription?.plan.slug ?? "free"
  const limits = PLAN_LIMITS[planSlug] ?? PLAN_LIMITS.free

  return {
    planSlug,
    maxProjects: limits.maxProjects,
    maxSeats: limits.maxSeats,
    currentProjects: projectCount,
    canDeploy: planSlug !== "free",
    canCreateProject: projectCount < limits.maxProjects,
  }
}
