import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscriptionId } = await params

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error("Get subscription error:", error)
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscriptionId } = await params
    const { planId, reason } = await req.json()

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    })

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    const newPlan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!newPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // For Stripe subscriptions, update via Stripe API
    if (subscription.paymentProvider === "STRIPE" && subscription.stripeSubscriptionId) {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      )

      const newPriceId =
        subscription.interval === "ANNUAL"
          ? newPlan.stripePriceIdAnnual
          : newPlan.stripePriceIdMonthly

      if (!newPriceId) {
        return NextResponse.json(
          { error: "New plan does not have a Stripe price configured" },
          { status: 400 }
        )
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: "create_prorations",
      })
    }

    // Update in DB for all providers
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { planId },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_CHANGE_PLAN",
        target: subscription.userId,
        metadata: {
          subscriptionId,
          oldPlanId: subscription.planId,
          oldPlanName: subscription.plan.name,
          newPlanId: planId,
          newPlanName: newPlan.name,
          reason: reason || null,
        },
      },
    })

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    console.error("Update subscription error:", error)
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscriptionId } = await params

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    })

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // Cancel Stripe subscription if applicable
    if (subscription.paymentProvider === "STRIPE" && subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
      } catch (err) {
        console.error("Failed to cancel Stripe subscription:", err)
      }
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "CANCELLED" },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_CANCEL_SUBSCRIPTION",
        target: subscription.userId,
        metadata: {
          subscriptionId,
          planName: subscription.plan.name,
          provider: subscription.paymentProvider,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cancel subscription error:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
