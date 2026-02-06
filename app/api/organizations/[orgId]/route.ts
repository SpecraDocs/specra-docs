import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

async function getOrgMembership(userId: string, orgId: string) {
  return prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await getOrgMembership(session.user.id, orgId)
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      projects: { include: { deployments: { where: { status: "RUNNING" }, take: 1 } } },
      _count: { select: { members: true, projects: true } },
    },
  })

  return NextResponse.json({ ...org, myRole: membership.role })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await getOrgMembership(session.user.id, orgId)
  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, avatar } = await req.json()

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name && { name }),
      ...(avatar !== undefined && { avatar }),
    },
  })

  return NextResponse.json(org)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orgId } = await params

  const membership = await getOrgMembership(session.user.id, orgId)
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can delete organizations" }, { status: 403 })
  }

  await prisma.organization.delete({ where: { id: orgId } })

  return NextResponse.json({ success: true })
}
