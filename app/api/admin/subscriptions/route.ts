import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 20
    const status = searchParams.get("status") || undefined
    const provider = searchParams.get("provider") || undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (provider) where.paymentProvider = provider

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ])

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("List subscriptions error:", error)
    return NextResponse.json(
      { error: "Failed to list subscriptions" },
      { status: 500 }
    )
  }
}
