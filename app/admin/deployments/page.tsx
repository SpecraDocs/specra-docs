"use client"

import { useState, useEffect } from "react"
import { Circle, Server } from "lucide-react"

interface Deployment {
  id: string
  status: string
  containerId: string | null
  port: number | null
  trigger: string
  createdAt: string
  project: {
    id: string
    name: string
    subdomain: string
    user: { email: string }
  }
}

const statusColors: Record<string, string> = {
  RUNNING: "text-green-500",
  BUILDING: "text-yellow-500",
  DEPLOYING: "text-blue-500",
  QUEUED: "text-muted-foreground",
}

export default function AdminDeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/deployments")
      .then((r) => r.json())
      .then(setDeployments)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Active Deployments
        </h1>
        <p className="text-muted-foreground mt-1">
          {deployments.length} active containers
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : deployments.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No active deployments.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Project
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Owner
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Port
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Trigger
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Started
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deployments.map((d) => (
                <tr key={d.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <Circle
                        className={`h-2.5 w-2.5 fill-current ${
                          statusColors[d.status] || "text-muted-foreground"
                        }`}
                      />
                      <span className="capitalize text-foreground">
                        {d.status.toLowerCase()}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {d.project.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.project.subdomain}.docs.specra.dev
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.project.user.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">
                    {d.port || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {d.trigger.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(d.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
