"use client"

import { useState, useEffect } from "react"
import { PeriodSelector } from "./components/period-selector"
import { ProjectFilter } from "./components/project-filter"
import { MetricsCards } from "./components/metrics-cards"
import { VisitorsChart } from "./components/visitors-chart"
import { TopPages } from "./components/top-pages"
import { GeoBreakdown } from "./components/geo-breakdown"
import { Referrers } from "./components/referrers"
import { Devices } from "./components/devices"

interface Project {
  id: string
  name: string
}

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

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [period, setPeriod] = useState("7d")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((projects: Project[]) => {
        setProjects(projects)
        if (projects.length > 0) {
          setSelectedProject(projects[0].id)
        } else {
          setLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    if (!selectedProject) return

    setLoading(true)
    setError("")

    fetch(`/api/analytics/${selectedProject}?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Analytics requires Starter+ plan" : "Failed to load")
        return r.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedProject, period])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track visitor traffic across your docs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <ProjectFilter
              projects={projects}
              value={selectedProject}
              onChange={setSelectedProject}
            />
          )}
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground text-center py-12">
          Loading analytics...
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No projects found. Create a project to start tracking analytics.
          </p>
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
