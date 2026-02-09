import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const deployments = await prisma.deployment.findMany({
    where: { status: { in: ["RUNNING", "BUILDING", "DEPLOYING", "QUEUED"] } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          subdomain: true,
          user: { select: { id: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(deployments)
}
