import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { validateCoupon } from "@/lib/coupons"
import { calculateOrderTotal } from "@/lib/tax"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { country, planId, interval, couponCode } = await req.json()

    if (!country || !planId) {
      return NextResponse.json(
        { error: "country and planId are required" },
        { status: 400 }
      )
    }

    // Look up by id first, then by slug
    let plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan) {
      plan = await prisma.plan.findUnique({ where: { slug: planId } })
    }
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Determine price based on interval and implied currency from country
    const isKes = country === "KE"
    const currency = isKes ? "KES" : "USD"

    let planPrice: number
    if (isKes) {
      planPrice = interval === "annual" ? (plan.priceKesAnnual ?? plan.priceKes) : plan.priceKes
    } else {
      planPrice = interval === "annual" ? (plan.priceUsdAnnual ?? plan.priceUsd) : plan.priceUsd
    }

    let discount = 0
    let couponValid = false
    let couponError: string | undefined

    if (couponCode) {
      const result = await validateCoupon(couponCode, plan.slug, planPrice, currency)
      if (result.valid) {
        discount = result.discount
        couponValid = true
      } else {
        couponError = result.error
      }
    }

    const totals = await calculateOrderTotal({
      planPrice,
      discount,
      country,
    })

    return NextResponse.json({
      ...totals,
      currency,
      couponValid,
      couponError,
    })
  } catch (error) {
    console.error("Tax calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate tax" }, { status: 500 })
  }
}
