import Link from "next/link"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { Circle, Users, Settings, FolderGit2 } from "lucide-react"

const statusColors: Record<string, string> = {
  RUNNING: "text-green-500",
  STOPPED: "text-muted-foreground",
  FAILED: "text-destructive",
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const { orgId } = await params

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  })
  if (!membership) notFound()

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        take: 5,
      },
      projects: {
        include: {
          deployments: {
            where: { status: "RUNNING" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { members: true, projects: true } },
    },
  })

  if (!org) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {org.slug} &middot;{" "}
            <span className="capitalize">{membership.role.toLowerCase()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/organizations/${orgId}/members`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="h-4 w-4" />
            Members ({org._count.members})
          </Link>
          {membership.role !== "MEMBER" && (
            <Link
              href={`/dashboard/organizations/${orgId}/settings`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Projects</h2>
          <Link
            href={`/dashboard/projects/new?orgId=${orgId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            New project
          </Link>
        </div>
        {org.projects.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No projects in this organization yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {org.projects.map((project) => {
              const isRunning = project.deployments.length > 0
              return (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.subdomain}.docs.specra.dev
                      </p>
                    </div>
                  </div>
                  <Circle
                    className={`h-2.5 w-2.5 fill-current ${
                      isRunning ? statusColors.RUNNING : statusColors.STOPPED
                    }`}
                  />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Members */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Members</h2>
          <Link
            href={`/dashboard/organizations/${orgId}/members`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {org.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-6 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {m.user.name || m.user.email}
                </p>
                <p className="text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              <span className="text-xs text-muted-foreground capitalize rounded-full border border-border px-2 py-0.5">
                {m.role.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
