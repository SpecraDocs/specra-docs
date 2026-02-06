import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { canAccessProject } from "@/lib/auth-utils"
import { getContainerLogs } from "@/lib/docker"

export async function GET(
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
  })

  if (!deployment || deployment.projectId !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let containerLogs = ""
  if (deployment.containerId && deployment.status === "RUNNING") {
    containerLogs = await getContainerLogs(deployment.containerId)
  }

  return NextResponse.json({ ...deployment, containerLogs })
}
