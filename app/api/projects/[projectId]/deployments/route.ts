import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { canAccessProject } from "@/lib/auth-utils"

export async function GET(
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

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50)
  const skip = (page - 1) * limit

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.deployment.count({ where: { projectId } }),
  ])

  return NextResponse.json({
    deployments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
