import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUserSubscription } from "@/lib/auth-utils"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const subscription = await getUserSubscription(session.user.id)

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
            {subscription?.plan?.name ?? "Free"}
          </p>
          {subscription && (
            <p className="mt-1 text-sm text-muted-foreground">
              {subscription.interval === "ANNUAL" ? "Annual" : "Monthly"} billing
            </p>
          )}
          <Link
            href="/dashboard/billing"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Manage plan
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

        {/* Payment Provider */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Payment Method
          </h3>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {subscription?.paymentProvider === "MPESA"
              ? "M-Pesa"
              : subscription
              ? "Stripe"
              : "None"}
          </p>
          {subscription && (
            <Link
              href="/dashboard/billing"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Update payment method
            </Link>
          )}
        </div>
      </div>

      {/* Quick actions */}
      {!subscription && (
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
