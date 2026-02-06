import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { stkPush } from "@/lib/mpesa"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phoneNumber, planId, interval } = await req.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    const amount =
      interval === "annual" ? (plan.priceKesAnnual ?? plan.priceKes) : plan.priceKes

    const result = await stkPush(
      phoneNumber,
      amount,
      `SPECRA-${plan.slug.toUpperCase()}`,
      `Specra ${plan.name} subscription`
    )

    if (result.ResponseCode !== "0") {
      return NextResponse.json(
        { error: result.ResponseDescription || "STK Push failed" },
        { status: 400 }
      )
    }

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount,
        currency: "KES",
        provider: "MPESA",
        providerTxId: result.CheckoutRequestID,
        status: "PENDING",
      },
    })

    return NextResponse.json({
      checkoutRequestId: result.CheckoutRequestID,
      message: result.CustomerMessage,
    })
  } catch (error) {
    console.error("M-Pesa STK Push error:", error)
    return NextResponse.json(
      { error: "Failed to initiate M-Pesa payment" },
      { status: 500 }
    )
  }
}
