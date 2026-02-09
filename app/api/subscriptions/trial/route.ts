import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

const TRIAL_DAYS = 14

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { planSlug, interval } = await req.json()

    if (!planSlug) {
      return NextResponse.json(
        { error: "planSlug is required" },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Check if user already has an active or trialing subscription
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    })

    if (existingSub) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 409 }
      )
    }

    // Check if user has already used a trial before
    const previousTrial = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["TRIALING", "CANCELLED", "ACTIVE", "PAST_DUE"] },
      },
    })

    if (previousTrial) {
      return NextResponse.json(
        { error: "You have already used your free trial" },
        { status: 409 }
      )
    }

    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        status: "TRIALING",
        paymentProvider: "ADMIN",
        interval: interval === "annual" ? "ANNUAL" : "MONTHLY",
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        grantReason: `${TRIAL_DAYS}-day free trial`,
      },
      include: {
        plan: { select: { name: true, slug: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "START_FREE_TRIAL",
        target: session.user.id,
        metadata: {
          planSlug: plan.slug,
          planName: plan.name,
          trialDays: TRIAL_DAYS,
          subscriptionId: subscription.id,
        },
      },
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error("Start trial error:", error)
    return NextResponse.json(
      { error: "Failed to start trial" },
      { status: 500 }
    )
  }
}
