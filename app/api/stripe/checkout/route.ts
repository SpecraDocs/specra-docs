import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { planId, interval } = await req.json()

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    const priceId =
      interval === "annual"
        ? plan.stripePriceIdAnnual
        : plan.stripePriceIdMonthly

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this plan" },
        { status: 400 }
      )
    }

    // Check if user already has a Stripe customer ID
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, stripeCustomerId: { not: null } },
    })

    const checkoutParams: Record<string, unknown> = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
        interval,
      },
    }

    if (existingSub?.stripeCustomerId) {
      checkoutParams.customer = existingSub.stripeCustomerId
    } else {
      checkoutParams.customer_email = session.user.email
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      checkoutParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    )

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
