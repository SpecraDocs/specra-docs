import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId, memberId } = await params

  const myMembership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  })
  if (!myMembership || myMembership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { role } = await req.json()

  if (!["ADMIN", "MEMBER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  // Can't change owner's role
  const target = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  })
  if (!target || target.orgId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 })
  }

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId, memberId } = await params

  const myMembership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  })

  const target = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  })
  if (!target || target.orgId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Members can remove themselves, admins/owners can remove others
  const isSelf = target.userId === session.user.id
  const isAdmin = myMembership && myMembership.role !== "MEMBER"

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 })
  }

  await prisma.organizationMember.delete({ where: { id: memberId } })

  return NextResponse.json({ success: true })
}
