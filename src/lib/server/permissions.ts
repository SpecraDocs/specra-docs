import { prisma } from "./db.js"
import { getUserSubscription } from "./auth-utils.js"
import { EXTRA_SEAT_PRICES } from "./stripe.js"

const PLAN_LIMITS: Record<string, { maxProjects: number; maxSeats: number }> = {
  free: { maxProjects: 1, maxSeats: 1 },
  starter: { maxProjects: 4, maxSeats: 3 },
  pro: { maxProjects: 20, maxSeats: 10 },
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

export async function canUseContactForm(userId: string) {
  if (await isAdmin(userId)) return true
  const subscription = await getUserSubscription(userId)
  if (!subscription) return false
  const slug = subscription.plan.slug
  return slug === "starter" || slug === "pro" || slug === "enterprise"
}

export async function canUseChat(userId: string) {
  if (await isAdmin(userId)) return true
  const subscription = await getUserSubscription(userId)
  if (!subscription) return false
  const slug = subscription.plan.slug
  return slug === "pro" || slug === "enterprise"
}

export async function getVersionHistoryLimit(userId: string) {
  if (await isAdmin(userId)) {
    return { versionHistoryDays: -1, cutoffDate: null }
  }

  const subscription = await getUserSubscription(userId)
  const features = (subscription?.plan.features ?? {}) as Record<string, unknown>
  const days = typeof features.versionHistoryDays === "number" ? features.versionHistoryDays : 7

  if (days === -1) {
    return { versionHistoryDays: -1, cutoffDate: null }
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  return { versionHistoryDays: days, cutoffDate }
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
    canDeploy: true,
    canCreateProject: projectCount < limits.maxProjects,
  }
}

export async function getOrgSeatInfo(orgId: string) {
  // Find the org owner's subscription
  const ownerMember = await prisma.organizationMember.findFirst({
    where: { orgId, role: "OWNER" },
  })

  if (!ownerMember) {
    return null
  }

  const subscription = await getUserSubscription(ownerMember.userId)
  const planSlug = subscription?.plan.slug ?? "free"
  const limits = PLAN_LIMITS[planSlug] ?? PLAN_LIMITS.free
  const extraSeats = subscription?.extraSeats ?? 0

  // Count current members + pending invitations
  const [memberCount, pendingInviteCount] = await Promise.all([
    prisma.organizationMember.count({ where: { orgId } }),
    prisma.orgInvitation.count({ where: { orgId, status: "PENDING" } }),
  ])

  const baseSeats = limits.maxSeats
  const totalAllowedSeats = baseSeats + extraSeats
  const currentUsage = memberCount + pendingInviteCount
  const remainingSeats = Math.max(0, totalAllowedSeats - currentUsage)
  const canAddSeat = currentUsage < totalAllowedSeats
  const canBuyExtraSeats =
    planSlug !== "free" &&
    planSlug !== "enterprise" &&
    !!EXTRA_SEAT_PRICES[planSlug]

  return {
    planSlug,
    baseSeats,
    extraSeats,
    totalAllowedSeats,
    currentUsage,
    memberCount,
    pendingInviteCount,
    remainingSeats,
    canAddSeat,
    canBuyExtraSeats,
    stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
    stripeExtraSeatItemId: subscription?.stripeExtraSeatItemId ?? null,
    subscriptionId: subscription?.id ?? null,
    interval: subscription?.interval ?? null,
    paymentProvider: subscription?.paymentProvider ?? null,
  }
}
