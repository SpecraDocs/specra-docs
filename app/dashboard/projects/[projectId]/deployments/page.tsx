import Link from "next/link"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { canAccessProject } from "@/lib/auth-utils"
import { Circle, ArrowLeft } from "lucide-react"

const statusColors: Record<string, string> = {
  RUNNING: "text-green-500",
  BUILDING: "text-yellow-500",
  DEPLOYING: "text-blue-500",
  QUEUED: "text-muted-foreground",
  STOPPED: "text-muted-foreground",
  FAILED: "text-destructive",
}

export default async function DeploymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { projectId } = await params
  const { page: pageStr } = await searchParams
  const page = parseInt(pageStr || "1")
  const limit = 20

  if (!(await canAccessProject(session.user.id, projectId))) {
    notFound()
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })
  if (!project) notFound()

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.deployment.count({ where: { projectId } }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {deployments.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No deployments yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {deployments.map((deploy) => (
              <div
                key={deploy.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Circle
                    className={`h-3 w-3 fill-current ${statusColors[deploy.status]}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {deploy.status.toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {deploy.id.slice(0, 8)}
                      {deploy.commitSha && (
                        <> &middot; {deploy.commitSha.slice(0, 7)}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground capitalize">
                    {deploy.trigger.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(deploy.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/dashboard/projects/${projectId}/deployments?page=${page - 1}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/dashboard/projects/${projectId}/deployments?page=${page + 1}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
