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

  const { installationId, repo, branch } = await req.json()

  if (!installationId || !repo) {
    return NextResponse.json(
      { error: "installationId and repo are required" },
      { status: 400 }
    )
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      githubInstallId: installationId,
      githubRepo: repo,
      githubBranch: branch || "main",
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(
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

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      githubInstallId: null,
      githubRepo: null,
      githubBranch: "main",
    },
  })

  return NextResponse.json(project)
}
