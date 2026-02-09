import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUserOrganizations } from "@/lib/auth-utils"
import { Plus, Building2, Users, FolderGit2 } from "lucide-react"

export default async function OrganizationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const memberships = await getUserOrganizations(session.user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Collaborate with your team on documentation projects
          </p>
        </div>
        <Link
          href="/dashboard/organizations/new"
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No organizations yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Create an organization to collaborate with your team. Requires Pro+ plan.
          </p>
          <Link
            href="/dashboard/organizations/new"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Organization
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {memberships.map((m) => (
            <Link
              key={m.organization.id}
              href={`/dashboard/organizations/${m.organization.id}`}
              className="rounded-lg border border-border bg-card p-6 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {m.organization.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {m.organization.slug} &middot;{" "}
                    <span className="capitalize">{m.role.toLowerCase()}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {m.organization._count.members}
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderGit2 className="h-3.5 w-3.5" />
                    {m.organization._count.projects}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
