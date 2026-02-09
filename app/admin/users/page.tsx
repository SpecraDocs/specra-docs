"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Shield, User, X, Ban, CheckCircle, MoreVertical, Crown, UserX, UserCheck } from "lucide-react"

interface UserData {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  createdAt: string
  isPrimaryAdmin: boolean
  isOnline: boolean
  activeSubscription: { planName: string; planSlug: string; status: string } | null
  _count: { subscriptions: number; projects: number }
}

interface Pagination {
  page: number
  totalPages: number
  total: number
}

function ActionsMenu({
  user,
  onToggleRole,
  onToggleStatus,
}: {
  user: UserData
  onToggleRole: () => void
  onToggleStatus: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (user.isPrimaryAdmin) {
    return (
      <span className="text-xs text-muted-foreground italic">Protected</span>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-card shadow-lg py-1">
          <button
            onClick={() => {
              setOpen(false)
              onToggleRole()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {user.role === "ADMIN" ? (
              <>
                <User className="h-4 w-4" />
                Remove Admin
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                Make Admin
              </>
            )}
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onToggleStatus()
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
              user.status === "ACTIVE"
                ? "text-red-600 hover:bg-red-500/10"
                : "text-green-600 hover:bg-green-500/10"
            }`}
          >
            {user.status === "ACTIVE" ? (
              <>
                <UserX className="h-4 w-4" />
                Block User
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                Unblock User
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
  })
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  function loadUsers(page = 1, searchTerm = search) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (searchTerm) params.set("search", searchTerm)

    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users)
        setPagination(data.pagination)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadUsers(1, search)
  }

  function clearSearch() {
    setSearch("")
    loadUsers(1, "")
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN"
    if (!confirm(`Change this user's role to ${newRole}?`)) return

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })

    if (res.ok) {
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
    } else {
      const error = await res.json()
      alert(error.error || "Failed to change user role")
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE"
    const action = newStatus === "BLOCKED" ? "block" : "unblock"

    if (
      !confirm(
        `Are you sure you want to ${action} this user? ${
          newStatus === "BLOCKED"
            ? "This will invalidate all their active sessions."
            : ""
        }`
      )
    )
      return

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })

    if (res.ok) {
      setUsers(
        users.map((u) =>
          u.id === userId
            ? { ...u, status: newStatus, isOnline: newStatus === "BLOCKED" ? false : u.isOnline }
            : u
        )
      )
    } else {
      const error = await res.json()
      alert(error.error || `Failed to ${action} user`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">
          {pagination.total} total users
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </form>

      {/* Users Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                User
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Role
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Subscription
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Projects
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Joined
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {user.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      {user.isOnline && (
                        <div className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${
                          user.role === "ADMIN"
                            ? "bg-destructive/10 text-destructive border border-destructive/30"
                            : "bg-accent text-muted-foreground border border-border"
                        }`}
                      >
                        {user.role === "ADMIN" ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {user.role}
                      </span>
                      {user.isPrimaryAdmin && (
                        <span className="text-xs text-muted-foreground italic">
                          (Primary)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${
                        user.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-600 border border-green-500/30"
                          : "bg-red-500/10 text-red-600 border border-red-500/30"
                      }`}
                    >
                      {user.status === "ACTIVE" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Ban className="h-3 w-3" />
                      )}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.activeSubscription ? (
                      <span className="inline-flex items-center text-xs rounded-full px-2 py-0.5 bg-primary/10 text-primary border border-primary/30">
                        {user.activeSubscription.planName}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user._count.projects}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end">
                      <ActionsMenu
                        user={user}
                        onToggleRole={() => toggleRole(user.id, user.role)}
                        onToggleStatus={() => toggleUserStatus(user.id, user.status)}
                      />
                    </div>
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
              onClick={() => loadUsers(pagination.page - 1)}
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
              onClick={() => loadUsers(pagination.page + 1)}
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
