import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { validateCoupon } from "@/lib/coupons"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code, planSlug, amount, currency } = await req.json()

    if (!code || !planSlug || !amount || !currency) {
      return NextResponse.json(
        { error: "code, planSlug, amount, and currency are required" },
        { status: 400 }
      )
    }

    const result = await validateCoupon(code, planSlug, amount, currency)

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error })
    }

    return NextResponse.json({
      valid: true,
      discount: result.discount,
      finalAmount: result.finalAmount,
      couponType: result.coupon.type,
      couponValue: result.coupon.value,
    })
  } catch (error) {
    console.error("Validate coupon error:", error)
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 })
  }
}
