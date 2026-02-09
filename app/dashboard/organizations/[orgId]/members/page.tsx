"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UserPlus, Trash2, Mail } from "lucide-react"

interface Member {
  id: string
  role: string
  user: { id: string; name: string | null; email: string }
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
}

export default function MembersPage() {
  const params = useParams()
  const orgId = params.orgId as string

  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [orgName, setOrgName] = useState("")
  const [myRole, setMyRole] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("MEMBER")
  const [inviteError, setInviteError] = useState("")
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/organizations/${orgId}`).then((r) => r.json()),
      fetch(`/api/organizations/${orgId}/members`).then((r) => r.json()),
      fetch(`/api/organizations/${orgId}/invitations`).then((r) => r.json()),
    ]).then(([org, members, invites]) => {
      setOrgName(org.name)
      setMyRole(org.myRole)
      setMembers(members)
      setInvitations(invites)
    })
  }, [orgId])

  const isAdmin = myRole === "OWNER" || myRole === "ADMIN"

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError("")

    const res = await fetch(`/api/organizations/${orgId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })

    if (!res.ok) {
      const data = await res.json()
      setInviteError(data.error)
      return
    }

    const inv = await res.json()
    setInvitations([inv, ...invitations])
    setInviteEmail("")
    setShowInvite(false)
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member from the organization?")) return
    const res = await fetch(
      `/api/organizations/${orgId}/members/${memberId}`,
      { method: "DELETE" }
    )
    if (res.ok) {
      setMembers(members.filter((m) => m.id !== memberId))
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(
      `/api/organizations/${orgId}/invitations/${inviteId}`,
      { method: "DELETE" }
    )
    if (res.ok) {
      setInvitations(invitations.filter((i) => i.id !== inviteId))
    }
  }

  async function updateRole(memberId: string, role: string) {
    await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    setMembers(
      members.map((m) => (m.id === memberId ? { ...m, role } : m))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/organizations/${orgId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            {orgName}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <form
          onSubmit={sendInvite}
          className="rounded-lg border border-border bg-card p-4 flex gap-2 items-end"
        >
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Send
          </button>
        </form>
      )}
      {inviteError && (
        <p className="text-sm text-destructive">{inviteError}</p>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-6 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-muted-foreground">
              Pending Invitations
            </h2>
          </div>
          <div className="divide-y divide-border">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {inv.role.toLowerCase()} &middot; Expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-6 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-muted-foreground">
            Members ({members.length})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {members.map((m) => (
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
              <div className="flex items-center gap-3">
                {isAdmin && m.role !== "OWNER" ? (
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value)}
                    className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  <span className="text-xs text-muted-foreground capitalize rounded-full border border-border px-2 py-0.5">
                    {m.role.toLowerCase()}
                  </span>
                )}
                {isAdmin && m.role !== "OWNER" && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
