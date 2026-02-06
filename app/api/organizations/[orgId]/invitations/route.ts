import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  })
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const invitations = await prisma.orgInvitation.findMany({
    where: { orgId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invitations)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  })
  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { email, role } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    const existingMember = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: existingUser.id, orgId } },
    })
    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 }
      )
    }
  }

  // Check for pending invite
  const pending = await prisma.orgInvitation.findFirst({
    where: { orgId, email, status: "PENDING" },
  })
  if (pending) {
    return NextResponse.json(
      { error: "Invitation already pending" },
      { status: 409 }
    )
  }

  const invitation = await prisma.orgInvitation.create({
    data: {
      orgId,
      email,
      role: role || "MEMBER",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })

  // In production, send email with invitation link
  // For now, return the token
  return NextResponse.json(
    {
      ...invitation,
      inviteUrl: `${process.env.NEXTAUTH_URL || ""}/invitations/accept?token=${invitation.token}`,
    },
    { status: 201 }
  )
}
