"use client"

import { useState, useEffect } from "react"
import { Tag, Plus, X } from "lucide-react"

interface Coupon {
  id: string
  code: string
  type: "PERCENTAGE" | "FIXED"
  value: number
  currency: string | null
  maxUses: number | null
  currentUses: number
  expiresAt: string | null
  active: boolean
  applicablePlans: string[]
  createdAt: string
}

interface Pagination {
  page: number
  totalPages: number
  total: number
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    currency: "USD",
    maxUses: "",
    expiresAt: "",
    applicablePlans: "",
  })

  function loadCoupons(page = 1) {
    setLoading(true)
    fetch(`/api/admin/coupons?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setCoupons(data.coupons)
        setPagination(data.pagination)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  async function handleCreate() {
    if (!form.code || !form.value) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: parseInt(form.value),
          currency: form.type === "FIXED" ? form.currency : undefined,
          maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
          expiresAt: form.expiresAt || undefined,
          applicablePlans: form.applicablePlans
            ? form.applicablePlans.split(",").map((s) => s.trim())
            : [],
        }),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setForm({ code: "", type: "PERCENTAGE", value: "", currency: "USD", maxUses: "", expiresAt: "", applicablePlans: "" })
        loadCoupons()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(couponId: string, active: boolean) {
    await fetch(`/api/admin/coupons/${couponId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    })
    loadCoupons(pagination.page)
  }

  async function handleDelete(couponId: string) {
    if (!confirm("Are you sure you want to deactivate this coupon?")) return
    await fetch(`/api/admin/coupons/${couponId}`, { method: "DELETE" })
    loadCoupons(pagination.page)
  }

  function formatValue(coupon: Coupon) {
    if (coupon.type === "PERCENTAGE") return `${coupon.value}%`
    if (coupon.currency === "KES") return `KES ${coupon.value}`
    return `$${(coupon.value / 100).toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Coupons
          </h1>
          <p className="text-muted-foreground mt-1">{pagination.total} total coupons</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Coupon
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uses</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">No coupons found.</td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{coupon.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{coupon.type}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatValue(coupon)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {coupon.currentUses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${
                      coupon.active
                        ? "text-green-600 bg-green-500/10"
                        : "text-red-600 bg-red-500/10"
                    }`}>
                      {coupon.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleActive(coupon.id, coupon.active)}
                        className="text-xs rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {coupon.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="text-xs rounded border border-red-500/30 px-2 py-1 text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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
              onClick={() => loadCoupons(pagination.page - 1)}
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
              onClick={() => loadCoupons(pagination.page + 1)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Create Coupon</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Code</label>
                <input
                  type="text"
                  placeholder="e.g., WELCOME20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                <div className="flex gap-2">
                  {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        form.type === t
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "PERCENTAGE" ? "Percentage" : "Fixed Amount"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Value {form.type === "PERCENTAGE" ? "(0-100%)" : "(in smallest currency unit)"}
                </label>
                <input
                  type="number"
                  placeholder={form.type === "PERCENTAGE" ? "e.g., 20" : "e.g., 500"}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              {form.type === "FIXED" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="USD">USD</option>
                    <option value="KES">KES</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Uses (optional)</label>
                <input
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Applicable Plans (optional, comma-separated slugs)
                </label>
                <input
                  type="text"
                  placeholder="e.g., starter,pro (leave empty for all)"
                  value={form.applicablePlans}
                  onChange={(e) => setForm({ ...form, applicablePlans: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={submitting || !form.code || !form.value}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
