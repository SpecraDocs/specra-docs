import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50)
  const search = url.searchParams.get("search") || ""
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        sessions: {
          where: {
            expires: { gt: new Date() },
          },
          select: {
            expires: true,
          },
          take: 1,
        },
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: { select: { name: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { subscriptions: true, projects: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  // Mark primary admin user and session status
  const primaryAdminEmail = process.env.ADMIN_EMAIL
  const usersWithFlags = users.map((user) => ({
    ...user,
    isPrimaryAdmin: primaryAdminEmail ? user.email === primaryAdminEmail : false,
    isOnline: user.sessions.length > 0,
    activeSubscription: user.subscriptions[0]
      ? { planName: user.subscriptions[0].plan.name, planSlug: user.subscriptions[0].plan.slug, status: user.subscriptions[0].status }
      : null,
    sessions: undefined,
    subscriptions: undefined,
  }))

  return NextResponse.json({
    users: usersWithFlags,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
