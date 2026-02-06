import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { canAccessProject } from "@/lib/auth-utils"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  if (!(await canAccessProject(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { domain } = await req.json()

  if (!domain) {
    return NextResponse.json(
      { error: "Domain is required" },
      { status: 400 }
    )
  }

  // Validate domain format
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return NextResponse.json(
      { error: "Invalid domain format" },
      { status: 400 }
    )
  }

  // Check if domain is already in use
  const existing = await prisma.project.findFirst({
    where: { customDomain: domain, id: { not: projectId } },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Domain is already in use" },
      { status: 409 }
    )
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { customDomain: domain },
  })

  return NextResponse.json({
    project,
    dnsInstructions: {
      type: "CNAME",
      name: domain,
      value: "docs.specra.dev",
      note: "Add this CNAME record in your DNS provider, then verify.",
    },
  })
}
