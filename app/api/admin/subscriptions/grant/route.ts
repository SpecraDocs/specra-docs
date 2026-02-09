import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, planId, interval, reason } = await req.json()

    if (!userId || !planId) {
      return NextResponse.json(
        { error: "userId and planId are required" },
        { status: 400 }
      )
    }

    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ])

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Cancel existing active subscriptions
    await prisma.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    })

    const now = new Date()
    const periodEnd = new Date(now)
    if (interval === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        paymentProvider: "ADMIN",
        status: "ACTIVE",
        interval: interval === "annual" ? "ANNUAL" : "MONTHLY",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        grantedBy: session.user.id,
        grantReason: reason || null,
      },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_GRANT_SUBSCRIPTION",
        target: userId,
        metadata: {
          planId,
          planName: plan.name,
          interval: interval || "monthly",
          reason: reason || null,
          subscriptionId: subscription.id,
        },
      },
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error("Grant subscription error:", error)
    return NextResponse.json(
      { error: "Failed to grant subscription" },
      { status: 500 }
    )
  }
}
