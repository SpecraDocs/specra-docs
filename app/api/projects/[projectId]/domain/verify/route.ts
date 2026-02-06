import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { canAccessProject } from "@/lib/auth-utils"
import { verifyDomainDns, addCustomDomainRoute } from "@/lib/caddy"

export async function POST(
  _req: NextRequest,
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      deployments: {
        where: { status: "RUNNING" },
        take: 1,
      },
    },
  })

  if (!project?.customDomain) {
    return NextResponse.json(
      { error: "No custom domain set" },
      { status: 400 }
    )
  }

  const result = await verifyDomainDns(project.customDomain)

  if (!result.verified) {
    return NextResponse.json(
      { verified: false, error: result.error },
      { status: 200 }
    )
  }

  // If verified and there's a running deployment, add the Caddy route
  const runningDeploy = project.deployments[0]
  if (runningDeploy?.port) {
    await addCustomDomainRoute(project.customDomain, runningDeploy.port)
  }

  return NextResponse.json({ verified: true })
}
