import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { checkPlanLimits } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { organization: { members: { some: { userId: session.user.id } } } },
      ],
    },
    include: {
      deployments: {
        where: { status: "RUNNING" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { deployments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limits = await checkPlanLimits(session.user.id)
  if (!limits.canCreateProject) {
    return NextResponse.json(
      { error: `Project limit reached (${limits.maxProjects} max for ${limits.planSlug} plan)` },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { name, slug, orgId } = body

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Name and slug are required" },
      { status: 400 }
    )
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
      { status: 400 }
    )
  }

  // Check slug uniqueness
  const existing = await prisma.project.findFirst({
    where: { OR: [{ slug }, { subdomain: slug }] },
  })
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 })
  }

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      subdomain: slug,
      userId: session.user.id,
      orgId: orgId || null,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
