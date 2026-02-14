import { prisma } from "./db.js"
import type { Coupon, CouponType } from "@prisma/client"

export async function validateCoupon(
  code: string,
  planSlug: string,
  amount: number,
  currency: string
): Promise<
  | { valid: true; coupon: Coupon; discount: number; finalAmount: number }
  | { valid: false; error: string }
> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })

  if (!coupon) {
    return { valid: false, error: "Coupon not found" }
  }

  if (!coupon.active) {
    return { valid: false, error: "Coupon is no longer active" }
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, error: "Coupon has expired" }
  }

  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    return { valid: false, error: "Coupon has reached its usage limit" }
  }

  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planSlug)) {
    return { valid: false, error: "Coupon is not valid for this plan" }
  }

  if (coupon.type === "FIXED" && coupon.currency && coupon.currency !== currency) {
    return { valid: false, error: `Coupon is only valid for ${coupon.currency} payments` }
  }

  const discount = calculateDiscount(coupon.type, coupon.value, amount)
  const finalAmount = Math.max(0, amount - discount)

  return { valid: true, coupon, discount, finalAmount }
}

export function calculateDiscount(type: CouponType, value: number, amount: number): number {
  if (type === "PERCENTAGE") {
    return Math.round((amount * value) / 100)
  }
  // FIXED
  return Math.min(value, amount)
}

export async function applyCoupon(couponId: string): Promise<void> {
  await prisma.coupon.update({
    where: { id: couponId },
    data: { currentUses: { increment: 1 } },
  })
}
