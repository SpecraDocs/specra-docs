"use client"

import { useState, useEffect } from "react"
import { Crown, Plus, X, RefreshCw } from "lucide-react"

interface Subscription {
  id: string
  status: string
  paymentProvider: string
  interval: string
  currentPeriodStart: string
  currentPeriodEnd: string
  grantedBy: string | null
  grantReason: string | null
  user: { id: string; name: string | null; email: string }
  plan: { id: string; name: string; slug: string }
}

interface Plan {
  id: string
  name: string
  slug: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface Pagination {
  page: number
  totalPages: number
  total: number
}

const statusColors: Record<string, string> = {
  ACTIVE: "text-green-600 bg-green-500/10",
  CANCELLED: "text-red-600 bg-red-500/10",
  PAST_DUE: "text-yellow-600 bg-yellow-500/10",
  TRIALING: "text-blue-600 bg-blue-500/10",
  INCOMPLETE: "text-muted-foreground bg-accent",
}

const providerColors: Record<string, string> = {
  STRIPE: "text-purple-600 bg-purple-500/10",
  MPESA: "text-green-600 bg-green-500/10",
  ADMIN: "text-orange-600 bg-orange-500/10",
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 })
  const [statusFilter, setStatusFilter] = useState("")
  const [providerFilter, setProviderFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [showChangePlanModal, setShowChangePlanModal] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState("")
  const [grantForm, setGrantForm] = useState({ userId: "", planId: "", interval: "monthly", reason: "" })
  const [changePlanForm, setChangePlanForm] = useState({ planId: "", reason: "" })
  const [submitting, setSubmitting] = useState(false)

  function loadSubscriptions(page = 1) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (statusFilter) params.set("status", statusFilter)
    if (providerFilter) params.set("provider", providerFilter)

    fetch(`/api/admin/subscriptions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSubscriptions(data.subscriptions)
        setPagination(data.pagination)
      })
      .finally(() => setLoading(false))
  }

  function loadPlans() {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(() => {
        // Load plans from a simple endpoint - we'll fetch from subscriptions context
      })
  }

  function searchUsers(query: string) {
    if (query.length < 2) return
    fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
  }

  useEffect(() => {
    loadSubscriptions()
  }, [statusFilter, providerFilter])

  useEffect(() => {
    // Fetch plans for modals
    fetch("/api/admin/subscriptions?page=1")
      .then((r) => r.json())
      .then((data) => {
        const uniquePlans = new Map<string, Plan>()
        data.subscriptions?.forEach((s: Subscription) => {
          uniquePlans.set(s.plan.id, s.plan)
        })
        if (uniquePlans.size > 0) setPlans(Array.from(uniquePlans.values()))
      })

    // Also try to get all plans from a direct query
    fetch("/api/admin/payments?page=1")
      .then((r) => r.json())
      .then(() => {})
  }, [])

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch.length >= 2) searchUsers(userSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  async function handleGrant() {
    if (!grantForm.userId || !grantForm.planId) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/subscriptions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grantForm),
      })
      if (res.ok) {
        setShowGrantModal(false)
        setGrantForm({ userId: "", planId: "", interval: "monthly", reason: "" })
        loadSubscriptions()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChangePlan(subscriptionId: string) {
    if (!changePlanForm.planId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changePlanForm),
      })
      if (res.ok) {
        setShowChangePlanModal(null)
        setChangePlanForm({ planId: "", reason: "" })
        loadSubscriptions()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(subscriptionId: string) {
    if (!confirm("Are you sure you want to cancel this subscription?")) return
    const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
      method: "DELETE",
    })
    if (res.ok) loadSubscriptions()
  }

  // Get available plans from existing subscriptions + hardcoded fallback
  const availablePlans = plans.length > 0
    ? plans
    : [
        { id: "", name: "Select a plan", slug: "" },
      ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Crown className="h-6 w-6" />
            Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total} total subscriptions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadSubscriptions()}
            className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Grant Access
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
          {["", "ACTIVE", "CANCELLED", "PAST_DUE"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s || "All Status"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-0.5">
          {["", "STRIPE", "MPESA", "ADMIN"].map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                providerFilter === p
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p || "All Providers"}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Interval</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period End</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  No subscriptions found.
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {sub.user.name || sub.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{sub.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{sub.plan.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${providerColors[sub.paymentProvider] || ""}`}>
                      {sub.paymentProvider}
                    </span>
                    {sub.paymentProvider === "ADMIN" && sub.grantReason && (
                      <p className="text-xs text-muted-foreground mt-1" title={sub.grantReason}>
                        {sub.grantReason.length > 30 ? sub.grantReason.slice(0, 30) + "..." : sub.grantReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${statusColors[sub.status] || ""}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{sub.interval}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {sub.status === "ACTIVE" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowChangePlanModal(sub.id)
                            setChangePlanForm({ planId: "", reason: "" })
                          }}
                          className="text-xs rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Change Plan
                        </button>
                        <button
                          onClick={() => handleCancel(sub.id)}
                          className="text-xs rounded border border-red-500/30 px-2 py-1 text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {pagination.page > 1 && (
            <button
              onClick={() => loadSubscriptions(pagination.page - 1)}
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
              onClick={() => loadSubscriptions(pagination.page + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* Grant Access Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Grant Access</h2>
              <button onClick={() => setShowGrantModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Search User</label>
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
                {users.length > 0 && userSearch.length >= 2 && (
                  <div className="mt-1 rounded-md border border-border bg-card max-h-32 overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setGrantForm({ ...grantForm, userId: u.id })
                          setUserSearch(u.email)
                          setUsers([])
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <span className="text-foreground">{u.name || u.email}</span>
                        <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Plan</label>
                <select
                  value={grantForm.planId}
                  onChange={(e) => setGrantForm({ ...grantForm, planId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select a plan</option>
                  {availablePlans.filter(p => p.id).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Interval</label>
                <div className="flex gap-2">
                  {["monthly", "annual"].map((int) => (
                    <button
                      key={int}
                      onClick={() => setGrantForm({ ...grantForm, interval: int })}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        grantForm.interval === int
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {int.charAt(0).toUpperCase() + int.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Beta tester reward"
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <button
                onClick={handleGrant}
                disabled={submitting || !grantForm.userId || !grantForm.planId}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Granting..." : "Grant Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Change Plan</h2>
              <button onClick={() => setShowChangePlanModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">New Plan</label>
                <select
                  value={changePlanForm.planId}
                  onChange={(e) => setChangePlanForm({ ...changePlanForm, planId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select a plan</option>
                  {availablePlans.filter(p => p.id).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Upgrade for support case"
                  value={changePlanForm.reason}
                  onChange={(e) => setChangePlanForm({ ...changePlanForm, reason: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <button
                onClick={() => handleChangePlan(showChangePlanModal)}
                disabled={submitting || !changePlanForm.planId}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Change Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
