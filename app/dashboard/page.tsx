import { cookies } from "next/headers"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUserSubscription } from "@/lib/auth-utils"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const cookieStore = await cookies()
  const scope = cookieStore.get("dashboard-scope")?.value ?? "personal"

  const [subscription, userIsAdmin] = await Promise.all([
    getUserSubscription(session.user.id),
    isAdmin(session.user.id),
  ])

  // Count projects based on scope
  let projectCount: number
  if (scope !== "personal") {
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: scope } },
    })
    if (membership) {
      projectCount = await prisma.project.count({ where: { orgId: scope } })
    } else {
      projectCount = await prisma.project.count({
        where: { userId: session.user.id, orgId: null },
      })
    }
  } else {
    projectCount = await prisma.project.count({
      where: { userId: session.user.id, orgId: null },
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Current Plan */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Current Plan</h3>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {userIsAdmin ? "Admin" : subscription?.plan?.name ?? "Free"}
          </p>
          {userIsAdmin ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Full platform access
            </p>
          ) : subscription ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {subscription.interval === "ANNUAL" ? "Annual" : "Monthly"} billing
            </p>
          ) : null}
          <Link
            href="/dashboard/billing"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Manage plan
          </Link>
        </div>

        {/* Projects count */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Projects</h3>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {projectCount}
          </p>
          <Link
            href="/dashboard/projects"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            View projects
          </Link>
        </div>

        {/* Subscription Status */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
          <div className="mt-2 flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                !subscription || subscription.status === "ACTIVE"
                  ? "bg-green-500"
                  : subscription.status === "PAST_DUE"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-2xl font-bold text-foreground capitalize">
              {subscription?.status?.toLowerCase() ?? "Active"}
            </span>
          </div>
          {subscription?.currentPeriodEnd && (
            <p className="mt-1 text-sm text-muted-foreground">
              Renews{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      {!subscription && !userIsAdmin && (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Upgrade your plan
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get access to custom domains, advanced analytics, AI-powered search, and more.
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View Plans
          </Link>
        </div>
      )}
    </div>
  )
}
