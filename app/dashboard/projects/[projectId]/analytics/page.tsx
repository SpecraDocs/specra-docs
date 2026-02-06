"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PeriodSelector } from "../../../analytics/components/period-selector"
import { MetricsCards } from "../../../analytics/components/metrics-cards"
import { VisitorsChart } from "../../../analytics/components/visitors-chart"
import { TopPages } from "../../../analytics/components/top-pages"
import { GeoBreakdown } from "../../../analytics/components/geo-breakdown"
import { Referrers } from "../../../analytics/components/referrers"
import { Devices } from "../../../analytics/components/devices"

interface AnalyticsData {
  totalViews: number
  uniqueVisitors: number
  avgDuration: number
  bounceRate: number
  topPages: Array<{ path: string; views: number }>
  pageViews: Array<{ date: string; count: number }>
  geo: Array<{ country: string; visitors: number }>
  referrers: Array<{ referrer: string; count: number }>
  devices: {
    browsers: Array<{ name: string; count: number }>
    os: Array<{ name: string; count: number }>
    devices: Array<{ name: string; count: number }>
  }
}

export default function ProjectAnalyticsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [period, setPeriod] = useState("7d")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [projectName, setProjectName] = useState("")

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p) => setProjectName(p.name))
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    setError("")

    fetch(`/api/analytics/${projectId}?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Analytics requires Starter+ plan" : "Failed to load")
        return r.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [projectId, period])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            {projectName || "Project"}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : loading ? (
        <div className="text-muted-foreground text-center py-12">
          Loading analytics...
        </div>
      ) : data ? (
        <div className="space-y-6">
          <MetricsCards
            totalViews={data.totalViews}
            uniqueVisitors={data.uniqueVisitors}
            avgDuration={data.avgDuration}
            bounceRate={data.bounceRate}
          />
          <VisitorsChart data={data.pageViews} />
          <div className="grid lg:grid-cols-2 gap-6">
            <TopPages pages={data.topPages} />
            <GeoBreakdown data={data.geo} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Referrers data={data.referrers} />
          </div>
          <Devices data={data.devices} />
        </div>
      ) : null}
    </div>
  )
}
