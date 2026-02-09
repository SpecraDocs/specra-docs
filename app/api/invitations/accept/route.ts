import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }

  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
    include: { organization: true },
  })

  if (!invitation) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 })
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Invitation is no longer valid" },
      { status: 400 }
    )
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    })
    return NextResponse.json({ error: "Invitation has expired" }, { status: 400 })
  }

  // Check email matches
  if (invitation.email !== session.user.email) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address" },
      { status: 403 }
    )
  }

  // Check if already a member
  const existing = await prisma.organizationMember.findUnique({
    where: {
      userId_orgId: { userId: session.user.id, orgId: invitation.orgId },
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: "You are already a member of this organization" },
      { status: 409 }
    )
  }

  // Accept: create membership and update invitation
  await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        userId: session.user.id,
        orgId: invitation.orgId,
        role: invitation.role,
      },
    }),
    prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ])

  return NextResponse.json({
    success: true,
    organization: invitation.organization,
  })
}
