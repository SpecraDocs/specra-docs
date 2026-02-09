import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId, inviteId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  })
  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const invitation = await prisma.orgInvitation.findUnique({
    where: { id: inviteId },
  })
  if (!invitation || invitation.orgId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.orgInvitation.delete({ where: { id: inviteId } })

  return NextResponse.json({ success: true })
}
