import { prisma } from "./db.js"

export async function getMRR() {
  // Monthly Recurring Revenue from active subscriptions
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { plan: true },
  })

  let mrrCents = 0
  for (const sub of activeSubscriptions) {
    if (sub.interval === "ANNUAL") {
      mrrCents += sub.plan.priceUsdAnnual ?? Math.round(sub.plan.priceUsd * 0.8)
    } else {
      mrrCents += sub.plan.priceUsd
    }
  }

  return mrrCents
}

export async function getChurnRate() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

  const [cancelled, totalAtStart] = await Promise.all([
    prisma.subscription.count({
      where: { status: "CANCELLED", updatedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.subscription.count({
      where: { createdAt: { lt: thirtyDaysAgo }, status: { in: ["ACTIVE", "CANCELLED"] } },
    }),
  ])

  if (totalAtStart === 0) return 0
  return Math.round((cancelled / totalAtStart) * 100)
}

export async function getTotalUsers() {
  return prisma.user.count()
}

export async function getNewUsers(days = 30) {
  const since = new Date(Date.now() - days * 86400000)
  return prisma.user.count({ where: { createdAt: { gte: since } } })
}

export async function getActiveDeployments() {
  return prisma.deployment.count({ where: { status: "RUNNING" } })
}

export async function getResourceUsage() {
  const running = await prisma.deployment.findMany({
    where: { status: "RUNNING" },
    include: { project: { select: { name: true, subdomain: true } } },
  })

  return {
    totalContainers: running.length,
    deployments: running.map((d) => ({
      id: d.id,
      projectName: d.project.name,
      subdomain: d.project.subdomain,
      port: d.port,
      createdAt: d.createdAt,
    })),
  }
}

export async function getPlatformTraffic(days = 30) {
  const since = new Date(Date.now() - days * 86400000)

  const [totalViews, uniqueSessions] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: since }, duration: null },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, duration: null },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }),
  ])

  return { totalViews, uniqueVisitors: uniqueSessions.length }
}

export async function getRevenueByProvider() {
  const [stripe, mpesa] = await Promise.all([
    prisma.payment.aggregate({
      where: { provider: "STRIPE", status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { provider: "MPESA", status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  return {
    stripe: { revenue: stripe._sum.amount || 0, count: stripe._count },
    mpesa: { revenue: mpesa._sum.amount || 0, count: mpesa._count },
  }
}

export async function getAdminDashboardStats() {
  const [mrr, churnRate, totalUsers, newUsers, activeDeployments, traffic, revenue] =
    await Promise.all([
      getMRR(),
      getChurnRate(),
      getTotalUsers(),
      getNewUsers(),
      getActiveDeployments(),
      getPlatformTraffic(),
      getRevenueByProvider(),
    ])

  return {
    mrr,
    churnRate,
    totalUsers,
    newUsers,
    activeDeployments,
    traffic,
    revenue,
  }
}
