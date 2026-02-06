"use client"

import { Eye, Users, Clock, ArrowDownUp } from "lucide-react"

interface MetricsCardsProps {
  totalViews: number
  uniqueVisitors: number
  avgDuration: number
  bounceRate: number
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export function MetricsCards({
  totalViews,
  uniqueVisitors,
  avgDuration,
  bounceRate,
}: MetricsCardsProps) {
  const cards = [
    {
      label: "Page Views",
      value: totalViews.toLocaleString(),
      icon: Eye,
    },
    {
      label: "Unique Visitors",
      value: uniqueVisitors.toLocaleString(),
      icon: Users,
    },
    {
      label: "Avg. Duration",
      value: formatDuration(avgDuration),
      icon: Clock,
    },
    {
      label: "Bounce Rate",
      value: `${bounceRate}%`,
      icon: ArrowDownUp,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <card.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
