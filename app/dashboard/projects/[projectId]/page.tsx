import Link from "next/link"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { canAccessProject } from "@/lib/auth-utils"
import {
  Globe,
  ExternalLink,
  Circle,
  GitBranch,
  Clock,
  Rocket,
} from "lucide-react"

const BASE_DOMAIN = process.env.DOCS_BASE_DOMAIN || "docs.specra.dev"

const statusColors: Record<string, string> = {
  RUNNING: "text-green-500",
  BUILDING: "text-yellow-500",
  DEPLOYING: "text-blue-500",
  QUEUED: "text-muted-foreground",
  STOPPED: "text-muted-foreground",
  FAILED: "text-destructive",
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { projectId } = await params

  if (!(await canAccessProject(session.user.id, projectId))) {
    notFound()
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      organization: { select: { name: true, slug: true } },
    },
  })

  if (!project) notFound()

  const latestDeploy = project.deployments[0]
  const isRunning = latestDeploy?.status === "RUNNING"
  const siteUrl = `https://${project.subdomain}.${BASE_DOMAIN}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.organization && (
            <p className="text-sm text-muted-foreground">
              {project.organization.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${project.id}/settings`}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* URLs */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Site URL
        </h2>
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline flex items-center gap-1"
          >
            {project.subdomain}.{BASE_DOMAIN}
            <ExternalLink className="h-3 w-3" />
          </a>
          {isRunning && (
            <span className="ml-auto flex items-center gap-1.5 text-sm text-green-500">
              <Circle className="h-2.5 w-2.5 fill-current" />
              Live
            </span>
          )}
        </div>
        {project.customDomain && (
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a
              href={`https://${project.customDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline flex items-center gap-1"
            >
              {project.customDomain}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {project.githubRepo && (
          <div className="flex items-center gap-3">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {project.githubRepo} ({project.githubBranch})
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/projects/${project.id}/deployments`}
          className="rounded-lg border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
        >
          <Rocket className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="font-medium text-foreground text-sm">Deployments</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.deployments.length} total
          </p>
        </Link>
        <Link
          href={`/dashboard/projects/${project.id}/analytics`}
          className="rounded-lg border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
        >
          <Clock className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="font-medium text-foreground text-sm">Analytics</p>
          <p className="text-xs text-muted-foreground mt-0.5">View traffic</p>
        </Link>
        <Link
          href={`/dashboard/projects/${project.id}/settings`}
          className="rounded-lg border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
        >
          <Globe className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="font-medium text-foreground text-sm">Domain</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.customDomain || "Set up custom domain"}
          </p>
        </Link>
      </div>

      {/* Recent Deployments */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Deployments</h2>
          <Link
            href={`/dashboard/projects/${project.id}/deployments`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        {project.deployments.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No deployments yet. Deploy using the CLI or connect a GitHub repo.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {project.deployments.map((deploy) => (
              <div
                key={deploy.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Circle
                    className={`h-2.5 w-2.5 fill-current ${statusColors[deploy.status]}`}
                  />
                  <span className="text-sm text-foreground capitalize">
                    {deploy.status.toLowerCase()}
                  </span>
                  {deploy.commitSha && (
                    <code className="text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
                      {deploy.commitSha.slice(0, 7)}
                    </code>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{deploy.trigger.toLowerCase()}</span>
                  <span>{new Date(deploy.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
