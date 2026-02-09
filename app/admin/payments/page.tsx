"use client"

import { useState, useEffect } from "react"

interface Payment {
  id: string
  amount: number
  currency: string
  provider: string
  status: string
  createdAt: string
  user: { name: string | null; email: string }
  subscription: { plan: { name: string } } | null
}

interface Pagination {
  page: number
  totalPages: number
  total: number
}

const statusColors: Record<string, string> = {
  COMPLETED: "text-green-600 bg-green-500/10",
  PENDING: "text-yellow-600 bg-yellow-500/10",
  FAILED: "text-red-600 bg-red-500/10",
  REFUNDED: "text-muted-foreground bg-accent",
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
  })
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)

  function loadPayments(page = 1) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filter) params.set("provider", filter)

    fetch(`/api/admin/payments?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.payments)
        setPagination(data.pagination)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPayments()
  }, [filter])

  function formatAmount(amount: number, currency: string) {
    if (currency === "KES") return `KES ${amount.toLocaleString()}`
    return `$${(amount / 100).toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total} total payments
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
          {["", "STRIPE", "MPESA"].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                filter === p
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                User
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Plan
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Amount
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Provider
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {payment.user.name || payment.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.subscription?.plan.name || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {formatAmount(payment.amount, payment.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.provider}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 ${
                        statusColors[payment.status] || "text-muted-foreground"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {pagination.page > 1 && (
            <button
              onClick={() => loadPayments(pagination.page - 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Previous
            </button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          {pagination.page < pagination.totalPages && (
            <button
              onClick={() => loadPayments(pagination.page + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  )
}
