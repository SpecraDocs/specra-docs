import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { getPlatformTraffic } from "@/lib/admin-stats"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [traffic30d, traffic7d, topProjects] = await Promise.all([
    getPlatformTraffic(30),
    getPlatformTraffic(7),
    prisma.analyticsEvent.groupBy({
      by: ["projectId"],
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        duration: null,
      },
      _count: true,
      orderBy: { _count: { projectId: "desc" } },
      take: 10,
    }),
  ])

  // Resolve project names
  const projectIds = topProjects.map((t) => t.projectId)
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, subdomain: true },
  })
  const projectMap = new Map(projects.map((p) => [p.id, p]))

  return NextResponse.json({
    last30Days: traffic30d,
    last7Days: traffic7d,
    topProjects: topProjects.map((t) => ({
      project: projectMap.get(t.projectId),
      views: t._count,
    })),
  })
}
