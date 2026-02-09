"use client"

import { useState, useEffect } from "react"
import {
  DollarSign,
  Users,
  Server,
  Eye,
  TrendingDown,
  UserPlus,
} from "lucide-react"

interface Stats {
  mrr: number
  churnRate: number
  totalUsers: number
  newUsers: number
  activeDeployments: number
  traffic: { totalViews: number; uniqueVisitors: number }
  revenue: {
    stripe: { revenue: number; count: number }
    mpesa: { revenue: number; count: number }
  }
}

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-muted-foreground">Loading admin data...</div>
  }

  if (!stats) return null

  const kpis = [
    {
      label: "Monthly Recurring Revenue",
      value: formatCents(stats.mrr),
      icon: DollarSign,
    },
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
    },
    {
      label: "New Users (30d)",
      value: stats.newUsers.toLocaleString(),
      icon: UserPlus,
    },
    {
      label: "Churn Rate (30d)",
      value: `${stats.churnRate}%`,
      icon: TrendingDown,
    },
    {
      label: "Active Deployments",
      value: stats.activeDeployments.toLocaleString(),
      icon: Server,
    },
    {
      label: "Page Views (30d)",
      value: stats.traffic.totalViews.toLocaleString(),
      icon: Eye,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and key metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <kpi.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue by Provider */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Revenue by Provider
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-md border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">Stripe</p>
            <p className="text-xl font-bold text-foreground">
              {formatCents(stats.revenue.stripe.revenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.revenue.stripe.count} payments
            </p>
          </div>
          <div className="rounded-md border border-border p-4">
            <p className="text-sm text-muted-foreground mb-1">M-Pesa</p>
            <p className="text-xl font-bold text-foreground">
              KES {stats.revenue.mpesa.revenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.revenue.mpesa.count} payments
            </p>
          </div>
        </div>
      </div>

      {/* Traffic Summary */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Platform Traffic (30 days)
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Page Views</p>
            <p className="text-xl font-bold text-foreground">
              {stats.traffic.totalViews.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unique Visitors</p>
            <p className="text-xl font-bold text-foreground">
              {stats.traffic.uniqueVisitors.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
