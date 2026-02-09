import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 20
    const activeOnly = searchParams.get("active") === "true"

    const where: Record<string, unknown> = {}
    if (activeOnly) where.active = true

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ])

    return NextResponse.json({
      coupons,
      pagination: { page, totalPages: Math.ceil(total / limit), total },
    })
  } catch (error) {
    console.error("List coupons error:", error)
    return NextResponse.json({ error: "Failed to list coupons" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code, type, value, currency, maxUses, expiresAt, applicablePlans } = await req.json()

    if (!code || !type || value === undefined) {
      return NextResponse.json(
        { error: "code, type, and value are required" },
        { status: 400 }
      )
    }

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 })
    }

    // Create Stripe coupon + promotion code
    let stripeCouponId: string | undefined
    let stripePromotionCodeId: string | undefined

    try {
      const stripeCouponParams: Record<string, unknown> = {
        name: code.toUpperCase(),
      }

      if (type === "PERCENTAGE") {
        stripeCouponParams.percent_off = value
      } else {
        stripeCouponParams.amount_off = value
        stripeCouponParams.currency = (currency || "usd").toLowerCase()
      }

      if (maxUses) {
        stripeCouponParams.max_redemptions = maxUses
      }

      if (expiresAt) {
        stripeCouponParams.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000)
      }

      const stripeCoupon = await stripe.coupons.create(
        stripeCouponParams as Parameters<typeof stripe.coupons.create>[0]
      )
      stripeCouponId = stripeCoupon.id

      const promotionCode = await stripe.promotionCodes.create(
        { coupon: stripeCoupon.id, code: code.toUpperCase() } as unknown as Parameters<typeof stripe.promotionCodes.create>[0]
      )
      stripePromotionCodeId = promotionCode.id
    } catch (stripeErr) {
      console.error("Stripe coupon creation failed (continuing without Stripe sync):", stripeErr)
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        currency: currency || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicablePlans: applicablePlans || [],
        stripeCouponId,
        stripePromotionCodeId,
      },
    })

    return NextResponse.json({ coupon })
  } catch (error) {
    console.error("Create coupon error:", error)
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 })
  }
}
