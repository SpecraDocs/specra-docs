import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getUserSubscription } from "@/lib/auth-utils"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Orgs require Pro+ plan
  const subscription = await getUserSubscription(session.user.id)
  const planSlug = subscription?.plan.slug
  if (!planSlug || (planSlug !== "pro" && planSlug !== "enterprise")) {
    return NextResponse.json(
      { error: "Organizations require a Pro or Enterprise plan" },
      { status: 403 }
    )
  }

  const { name, slug } = await req.json()

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Name and slug are required" },
      { status: 400 }
    )
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
      { status: 400 }
    )
  }

  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 })
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    include: { _count: { select: { members: true, projects: true } } },
  })

  return NextResponse.json(org, { status: 201 })
}
