import { prisma } from "@/lib/db"

type Period = "24h" | "7d" | "30d" | "90d"

function getPeriodDate(period: Period): Date {
  const now = new Date()
  switch (period) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  }
}

export async function getPageViews(projectId: string, period: Period) {
  const since = getPeriodDate(period)

  const events = await prisma.analyticsEvent.groupBy({
    by: ["createdAt"],
    where: {
      projectId,
      createdAt: { gte: since },
      duration: null, // Only count initial pageview events
    },
    _count: true,
    orderBy: { createdAt: "asc" },
  })

  // Aggregate by day
  const byDay = new Map<string, number>()
  for (const e of events) {
    const day = new Date(e.createdAt).toISOString().split("T")[0]
    byDay.set(day, (byDay.get(day) || 0) + e._count)
  }

  return Array.from(byDay.entries()).map(([date, count]) => ({ date, count }))
}

export async function getUniqueVisitors(projectId: string, period: Period) {
  const since = getPeriodDate(period)

  const result = await prisma.analyticsEvent.findMany({
    where: {
      projectId,
      createdAt: { gte: since },
      duration: null,
    },
    select: { sessionId: true },
    distinct: ["sessionId"],
  })

  return result.length
}

export async function getTopPages(
  projectId: string,
  period: Period,
  limit = 10
) {
  const since = getPeriodDate(period)

  const pages = await prisma.analyticsEvent.groupBy({
    by: ["path"],
    where: {
      projectId,
      createdAt: { gte: since },
      duration: null,
    },
    _count: true,
    orderBy: { _count: { path: "desc" } },
    take: limit,
  })

  return pages.map((p) => ({ path: p.path, views: p._count }))
}

export async function getGeoBreakdown(projectId: string, period: Period) {
  const since = getPeriodDate(period)

  const geo = await prisma.analyticsEvent.groupBy({
    by: ["country"],
    where: {
      projectId,
      createdAt: { gte: since },
      duration: null,
      country: { not: null },
    },
    _count: true,
    orderBy: { _count: { country: "desc" } },
    take: 20,
  })

  return geo.map((g) => ({ country: g.country!, visitors: g._count }))
}

export async function getReferrers(projectId: string, period: Period) {
  const since = getPeriodDate(period)

  const refs = await prisma.analyticsEvent.groupBy({
    by: ["referrer"],
    where: {
      projectId,
      createdAt: { gte: since },
      duration: null,
      referrer: { not: null },
    },
    _count: true,
    orderBy: { _count: { referrer: "desc" } },
    take: 10,
  })

  return refs.map((r) => ({ referrer: r.referrer!, count: r._count }))
}

export async function getDeviceBreakdown(projectId: string, period: Period) {
  const since = getPeriodDate(period)

  const [browsers, osData, devices] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["browser"],
      where: { projectId, createdAt: { gte: since }, duration: null, browser: { not: null } },
      _count: true,
      orderBy: { _count: { browser: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["os"],
      where: { projectId, createdAt: { gte: since }, duration: null, os: { not: null } },
      _count: true,
      orderBy: { _count: { os: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["device"],
      where: { projectId, createdAt: { gte: since }, duration: null, device: { not: null } },
      _count: true,
      orderBy: { _count: { device: "desc" } },
      take: 10,
    }),
  ])

  return {
    browsers: browsers.map((b) => ({ name: b.browser!, count: b._count })),
    os: osData.map((o) => ({ name: o.os!, count: o._count })),
    devices: devices.map((d) => ({ name: d.device!, count: d._count })),
  }
}

export async function getAverageSessionDuration(
  projectId: string,
  period: Period
) {
  const since = getPeriodDate(period)

  const result = await prisma.analyticsEvent.aggregate({
    where: {
      projectId,
      createdAt: { gte: since },
      duration: { not: null, gt: 0 },
    },
    _avg: { duration: true },
  })

  return Math.round(result._avg.duration || 0)
}

export async function getRealtimeVisitors(projectId: string) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  const result = await prisma.analyticsEvent.findMany({
    where: {
      projectId,
      createdAt: { gte: fiveMinutesAgo },
      duration: null,
    },
    select: { sessionId: true },
    distinct: ["sessionId"],
  })

  return result.length
}

export async function getAnalyticsSummary(projectId: string, period: Period) {
  const since = getPeriodDate(period)

  const [totalViews, uniqueVisitors, avgDuration, topPages] =
    await Promise.all([
      prisma.analyticsEvent.count({
        where: { projectId, createdAt: { gte: since }, duration: null },
      }),
      getUniqueVisitors(projectId, period),
      getAverageSessionDuration(projectId, period),
      getTopPages(projectId, period, 5),
    ])

  // Bounce rate: sessions with only one pageview
  const allSessions = await prisma.analyticsEvent.groupBy({
    by: ["sessionId"],
    where: { projectId, createdAt: { gte: since }, duration: null },
    _count: true,
  })
  const bouncedSessions = allSessions.filter((s) => s._count === 1).length
  const bounceRate =
    allSessions.length > 0
      ? Math.round((bouncedSessions / allSessions.length) * 100)
      : 0

  return {
    totalViews,
    uniqueVisitors,
    avgDuration,
    bounceRate,
    topPages,
  }
}
