import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { canAccessProject } from "@/lib/auth-utils"
import { stopContainer, removeContainer } from "@/lib/docker"
import { removeRoute } from "@/lib/caddy"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; deploymentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, deploymentId } = await params

  if (!(await canAccessProject(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: true },
  })

  if (!deployment || deployment.projectId !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (deployment.status !== "RUNNING") {
    return NextResponse.json(
      { error: "Deployment is not running" },
      { status: 400 }
    )
  }

  if (deployment.containerId) {
    await stopContainer(deployment.containerId)
    await removeContainer(deployment.containerId)
  }

  // Remove Caddy routes
  await removeRoute(`specra-${deployment.project.subdomain}`)
  if (deployment.project.customDomain) {
    await removeRoute(
      `specra-custom-${deployment.project.customDomain.replace(/\./g, "-")}`
    )
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: "STOPPED" },
  })

  return NextResponse.json({ success: true })
}
