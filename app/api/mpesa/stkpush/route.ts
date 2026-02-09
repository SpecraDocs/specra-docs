import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { stkPush } from "@/lib/mpesa"
import { prisma } from "@/lib/db"
import { validateCoupon, applyCoupon } from "@/lib/coupons"
import { calculateOrderTotal } from "@/lib/tax"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phoneNumber, planId, interval, couponCode, billingAddress } = await req.json()

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

    // Save/update billing address if provided
    if (billingAddress && billingAddress.address && billingAddress.city && billingAddress.country) {
      await prisma.billingAddress.upsert({
        where: { userId: session.user.id },
        update: {
          address: billingAddress.address,
          city: billingAddress.city,
          state: billingAddress.state || null,
          country: billingAddress.country,
          postalCode: billingAddress.postalCode || null,
          taxPin: billingAddress.taxPin || null,
        },
        create: {
          userId: session.user.id,
          address: billingAddress.address,
          city: billingAddress.city,
          state: billingAddress.state || null,
          country: billingAddress.country,
          postalCode: billingAddress.postalCode || null,
          taxPin: billingAddress.taxPin || null,
        },
      })
    }

    let baseAmount =
      interval === "annual" ? (plan.priceKesAnnual ?? plan.priceKes) : plan.priceKes

    let discount = 0
    let couponId: string | undefined

    // Validate and apply coupon
    if (couponCode) {
      const result = await validateCoupon(couponCode, plan.slug, baseAmount, "KES")
      if (result.valid) {
        discount = result.discount
        couponId = result.coupon.id
      }
    }

    // Calculate tax
    const country = billingAddress?.country || "KE"
    const totals = await calculateOrderTotal({
      planPrice: baseAmount,
      discount,
      country,
    })

    const finalAmount = totals.total

    const result = await stkPush(
      phoneNumber,
      finalAmount,
      `SPECRA-${plan.slug.toUpperCase()}`,
      `Specra ${plan.name} subscription`
    )

    if (result.ResponseCode !== "0") {
      return NextResponse.json(
        { error: result.ResponseDescription || "STK Push failed" },
        { status: 400 }
      )
    }

    // Increment coupon usage
    if (couponId) {
      await applyCoupon(couponId)
    }

    // Create a pending payment record with coupon and tax info
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: finalAmount,
        currency: "KES",
        provider: "MPESA",
        providerTxId: result.CheckoutRequestID,
        status: "PENDING",
        couponCode: couponCode?.toUpperCase() || null,
        taxAmount: totals.taxAmount || null,
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
