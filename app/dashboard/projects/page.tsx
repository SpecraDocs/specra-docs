import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { checkPlanLimits } from "@/lib/permissions"
import { Plus, Globe, Circle } from "lucide-react"

const statusColors: Record<string, string> = {
  RUNNING: "text-green-500",
  BUILDING: "text-yellow-500",
  DEPLOYING: "text-blue-500",
  QUEUED: "text-muted-foreground",
  STOPPED: "text-muted-foreground",
  FAILED: "text-destructive",
}

export default async function ProjectsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const [projects, limits] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { organization: { members: { some: { userId: session.user.id } } } },
        ],
      },
      include: {
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    checkPlanLimits(session.user.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} of {limits.maxProjects === Infinity ? "unlimited" : limits.maxProjects} projects
          </p>
        </div>
        {limits.canCreateProject && (
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No projects yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Create your first project to deploy your docs online.
          </p>
          {limits.canCreateProject && (
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </Link>
          )}
          {!limits.canDeploy && (
            <p className="text-sm text-muted-foreground mt-4">
              Upgrade to a paid plan to deploy projects.{" "}
              <Link href="/pricing" className="text-foreground underline">
                View plans
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const latestDeploy = project.deployments[0]
            const status = latestDeploy?.status || "NO_DEPLOY"

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="rounded-lg border border-border bg-card p-6 hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {project.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {project.subdomain}.docs.specra.dev
                      {project.customDomain && (
                        <span className="ml-2">
                          ({project.customDomain})
                        </span>
                      )}
                    </p>
                    {project.organization && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.organization.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Circle
                      className={`h-3 w-3 fill-current ${statusColors[status] || "text-muted-foreground"}`}
                    />
                    <span className="text-muted-foreground capitalize">
                      {status === "NO_DEPLOY"
                        ? "Not deployed"
                        : status.toLowerCase()}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
