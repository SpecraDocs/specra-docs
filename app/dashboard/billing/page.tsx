import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getUserSubscription } from "@/lib/auth-utils"
import Link from "next/link"
import { ManageSubscriptionButton } from "./manage-button"

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const subscription = await getUserSubscription(session.user.id)

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and payment history
        </p>
      </div>

      {/* Current subscription */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Current Subscription
        </h2>

        {subscription ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium text-foreground">
                  {subscription.plan.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing</p>
                <p className="font-medium text-foreground">
                  {subscription.interval === "ANNUAL" ? "Annual" : "Monthly"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      subscription.status === "ACTIVE"
                        ? "bg-green-500"
                        : subscription.status === "PAST_DUE"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="font-medium text-foreground capitalize">
                    {subscription.status.toLowerCase().replace("_", " ")}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Period</p>
                <p className="font-medium text-foreground">
                  {new Date(
                    subscription.currentPeriodStart
                  ).toLocaleDateString()}{" "}
                  -{" "}
                  {new Date(
                    subscription.currentPeriodEnd
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>

            {subscription.paymentProvider === "STRIPE" && (
              <ManageSubscriptionButton />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              You are on the <strong>Free</strong> plan.
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Upgrade Plan
            </Link>
          </div>
        )}
      </div>

      {/* Payment history */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Payment History
        </h2>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Provider
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-foreground">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {payment.currency === "KES"
                        ? `KES ${payment.amount.toLocaleString()}`
                        : `$${(payment.amount / 100).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {payment.provider === "MPESA" ? "M-Pesa" : "Stripe"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.status === "COMPLETED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : payment.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : payment.status === "FAILED"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                        }`}
                      >
                        {payment.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No payments yet.</p>
        )}
      </div>
    </div>
  )
}
