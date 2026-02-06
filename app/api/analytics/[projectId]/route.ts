import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canViewAnalytics } from "@/lib/permissions"
import {
  getAnalyticsSummary,
  getPageViews,
  getTopPages,
  getGeoBreakdown,
  getReferrers,
  getDeviceBreakdown,
  getRealtimeVisitors,
} from "@/lib/analytics"

type Period = "24h" | "7d" | "30d" | "90d"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  if (!(await canViewAnalytics(session.user.id, projectId))) {
    return NextResponse.json(
      { error: "Analytics requires Starter+ plan" },
      { status: 403 }
    )
  }

  const url = new URL(req.url)
  const period = (url.searchParams.get("period") || "7d") as Period
  const metric = url.searchParams.get("metric")

  if (!["24h", "7d", "30d", "90d"].includes(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 })
  }

  // If a specific metric is requested, return just that
  if (metric) {
    switch (metric) {
      case "pageviews":
        return NextResponse.json(await getPageViews(projectId, period))
      case "toppages":
        return NextResponse.json(await getTopPages(projectId, period))
      case "geo":
        return NextResponse.json(await getGeoBreakdown(projectId, period))
      case "referrers":
        return NextResponse.json(await getReferrers(projectId, period))
      case "devices":
        return NextResponse.json(await getDeviceBreakdown(projectId, period))
      case "realtime":
        return NextResponse.json({ visitors: await getRealtimeVisitors(projectId) })
      default:
        return NextResponse.json({ error: "Invalid metric" }, { status: 400 })
    }
  }

  // Return full summary
  const [summary, pageViews, geo, referrers, devices] = await Promise.all([
    getAnalyticsSummary(projectId, period),
    getPageViews(projectId, period),
    getGeoBreakdown(projectId, period),
    getReferrers(projectId, period),
    getDeviceBreakdown(projectId, period),
  ])

  return NextResponse.json({
    ...summary,
    pageViews,
    geo,
    referrers,
    devices,
  })
}
