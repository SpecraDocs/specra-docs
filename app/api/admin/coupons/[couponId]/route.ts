import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { couponId } = await params
    const updates = await req.json()

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } })
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (updates.active !== undefined) data.active = updates.active
    if (updates.maxUses !== undefined) data.maxUses = updates.maxUses
    if (updates.expiresAt !== undefined) data.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null
    if (updates.applicablePlans !== undefined) data.applicablePlans = updates.applicablePlans

    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data,
    })

    return NextResponse.json({ coupon: updated })
  } catch (error) {
    console.error("Update coupon error:", error)
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { couponId } = await params

    await prisma.coupon.update({
      where: { id: couponId },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete coupon error:", error)
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }
}
