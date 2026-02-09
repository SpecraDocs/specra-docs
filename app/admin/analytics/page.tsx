"use client"

import { useState, useEffect } from "react"
import { Eye, Users } from "lucide-react"

interface AnalyticsData {
  last30Days: { totalViews: number; uniqueVisitors: number }
  last7Days: { totalViews: number; uniqueVisitors: number }
  topProjects: Array<{
    project: { id: string; name: string; subdomain: string } | null
    views: number
  }>
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Aggregated traffic across all hosted docs
        </p>
      </div>

      {/* Traffic Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-medium">Views (7d)</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {data.last7Days.totalViews.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Visitors (7d)</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {data.last7Days.uniqueVisitors.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-medium">Views (30d)</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {data.last30Days.totalViews.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Visitors (30d)</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {data.last30Days.uniqueVisitors.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Top Projects */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Top Projects by Traffic (30 days)
        </h2>
        {data.topProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No traffic data yet.
          </p>
        ) : (
          <div className="space-y-3">
            {data.topProjects.map((entry, i) => {
              const max = data.topProjects[0]?.views || 1
              return (
                <div key={entry.project?.id || i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground">
                      {entry.project?.name || "Unknown"}{" "}
                      <span className="text-muted-foreground">
                        ({entry.project?.subdomain}.docs.specra.dev)
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {entry.views.toLocaleString()} views
                    </span>
                  </div>
                  <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/30 rounded-full"
                      style={{
                        width: `${(entry.views / max) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
