import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { getAdminDashboardStats } from "@/lib/admin-stats"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const stats = await getAdminDashboardStats()
  return NextResponse.json(stats)
}
