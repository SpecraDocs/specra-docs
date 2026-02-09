import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendSubscriptionExpiringEmail } from "@/lib/email"

export async function GET(req: Request) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  const results = {
    reminders: 0,
    cancelled: 0,
    errors: [] as string[],
  }

  try {
    // Find M-Pesa/Admin subscriptions expiring within 3 days
    const expiringSubs = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        paymentProvider: { in: ["MPESA", "ADMIN"] },
        currentPeriodEnd: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: { user: true, plan: true },
    })

    for (const sub of expiringSubs) {
      try {
        const expiryDate = sub.currentPeriodEnd.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })

        await sendSubscriptionExpiringEmail({
          to: sub.user.email,
          userName: sub.user.name || sub.user.email,
          planName: sub.plan.name,
          expiryDate,
        })
        results.reminders++
      } catch (err) {
        results.errors.push(`Failed to send reminder for sub ${sub.id}: ${err}`)
      }
    }

    // Cancel expired non-Stripe subscriptions
    const expiredSubs = await prisma.subscription.updateMany({
      where: {
        status: "ACTIVE",
        paymentProvider: { in: ["MPESA", "ADMIN"] },
        currentPeriodEnd: { lt: now },
      },
      data: { status: "CANCELLED" },
    })
    results.cancelled = expiredSubs.count

    return NextResponse.json({
      success: true,
      reminders: results.reminders,
      cancelled: results.cancelled,
      errors: results.errors,
    })
  } catch (error) {
    console.error("Cron subscription-reminders error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
