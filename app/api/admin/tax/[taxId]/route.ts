import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taxId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taxId } = await params
    const updates = await req.json()

    const config = await prisma.taxConfig.findUnique({ where: { id: taxId } })
    if (!config) {
      return NextResponse.json({ error: "Tax config not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (updates.rate !== undefined) data.rate = parseFloat(updates.rate)
    if (updates.name !== undefined) data.name = updates.name
    if (updates.active !== undefined) data.active = updates.active

    const updated = await prisma.taxConfig.update({
      where: { id: taxId },
      data,
    })

    return NextResponse.json({ config: updated })
  } catch (error) {
    console.error("Update tax config error:", error)
    return NextResponse.json({ error: "Failed to update tax config" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taxId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taxId } = await params

    await prisma.taxConfig.delete({ where: { id: taxId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete tax config error:", error)
    return NextResponse.json({ error: "Failed to delete tax config" }, { status: 500 })
  }
}
