import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import type Stripe from "stripe"

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const firstItem = subscription.items?.data?.[0]
  if (firstItem) {
    return {
      start: new Date(firstItem.current_period_start * 1000),
      end: new Date(firstItem.current_period_end * 1000),
    }
  }
  // Fallback to creation date + 30 days
  const start = new Date(subscription.created * 1000)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return { start, end }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId
  const interval = session.metadata?.interval as "monthly" | "annual"

  if (!userId || !planId) {
    console.error("Missing metadata in checkout session")
    return
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  const period = getSubscriptionPeriod(stripeSubscription)

  // Cancel any existing active subscriptions
  await prisma.subscription.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  })

  await prisma.subscription.create({
    data: {
      userId,
      planId,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: session.customer as string,
      status: "ACTIVE",
      paymentProvider: "STRIPE",
      interval: interval === "annual" ? "ANNUAL" : "MONTHLY",
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  })

  await prisma.payment.create({
    data: {
      userId,
      amount: session.amount_total ?? 0,
      currency: "USD",
      provider: "STRIPE",
      providerTxId: session.payment_intent as string,
      status: "COMPLETED",
    },
  })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!dbSub) return

  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    canceled: "CANCELLED",
    past_due: "PAST_DUE",
    trialing: "TRIALING",
    incomplete: "INCOMPLETE",
  }

  const period = getSubscriptionPeriod(subscription)

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: (statusMap[subscription.status] ?? "ACTIVE") as
        | "ACTIVE"
        | "CANCELLED"
        | "PAST_DUE"
        | "TRIALING"
        | "INCOMPLETE",
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "CANCELLED" },
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription as string | null
  if (!subscriptionId) return

  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!dbSub) return

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: "PAST_DUE" },
  })

  await prisma.payment.create({
    data: {
      userId: dbSub.userId,
      subscriptionId: dbSub.id,
      amount: invoice.amount_due ?? 0,
      currency: "USD",
      provider: "STRIPE",
      providerTxId:
        typeof invoice.payment_settings?.default_mandate === "string"
          ? invoice.payment_settings.default_mandate
          : invoice.id,
      status: "FAILED",
    },
  })
}
