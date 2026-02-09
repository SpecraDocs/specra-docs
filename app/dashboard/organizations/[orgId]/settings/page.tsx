"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"

interface Org {
  id: string
  name: string
  slug: string
  myRole: string
}

export default function OrgSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.orgId as string

  const [org, setOrg] = useState<Org | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/organizations/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        setOrg(data)
        setName(data.name)
      })
  }, [orgId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (
      !confirm(
        "Delete this organization? All projects will be unlinked. This cannot be undone."
      )
    )
      return
    setDeleting(true)
    const res = await fetch(`/api/organizations/${orgId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      router.push("/dashboard/organizations")
    }
    setDeleting(false)
  }

  if (!org) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link
          href={`/dashboard/organizations/${orgId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          {org.name}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Organization Settings
        </h1>
      </div>

      {/* General */}
      <form
        onSubmit={handleSave}
        className="rounded-lg border border-border bg-card p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-foreground">General</h2>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Slug
          </label>
          <p className="text-sm text-muted-foreground">{org.slug}</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      {/* Danger Zone */}
      {org.myRole === "OWNER" && (
        <div className="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-destructive">
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground">
            Deleting this organization will remove all members and unlink all
            projects.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete Organization"}
          </button>
        </div>
      )}
    </div>
  )
}
