"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"

interface Project {
  id: string
  name: string
  slug: string
  subdomain: string
  customDomain: string | null
  githubRepo: string | null
  githubBranch: string | null
}

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [domain, setDomain] = useState("")
  const [domainError, setDomainError] = useState("")
  const [domainSuccess, setDomainSuccess] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data)
        setDomain(data.customDomain || "")
      })
  }, [projectId])

  async function handleSetDomain(e: React.FormEvent) {
    e.preventDefault()
    setDomainError("")
    setDomainSuccess("")

    const res = await fetch(`/api/projects/${projectId}/domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    })

    if (!res.ok) {
      const data = await res.json()
      setDomainError(data.error)
      return
    }

    const data = await res.json()
    setDomainSuccess(
      `Domain set. Add a CNAME record: ${data.dnsInstructions.name} → ${data.dnsInstructions.value}`
    )
    setProject(data.project)
  }

  async function handleVerifyDomain() {
    setVerifying(true)
    setDomainError("")
    setDomainSuccess("")

    const res = await fetch(`/api/projects/${projectId}/domain/verify`, {
      method: "POST",
    })
    const data = await res.json()

    if (data.verified) {
      setDomainSuccess("Domain verified and active!")
    } else {
      setDomainError(data.error || "DNS verification failed")
    }
    setVerifying(false)
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this project? This will stop all running deployments and cannot be undone.")) {
      return
    }
    setDeleting(true)
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/projects")
    }
    setDeleting(false)
  }

  if (!project) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Project Settings
        </h1>
      </div>

      {/* Custom Domain */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Custom Domain</h2>
        <p className="text-sm text-muted-foreground">
          Point your own domain to this project. Add a CNAME record pointing to{" "}
          <code className="bg-accent px-1 py-0.5 rounded text-xs">
            docs.specra.dev
          </code>
        </p>
        <form onSubmit={handleSetDomain} className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="docs.example.com"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Set Domain
          </button>
        </form>
        {project.customDomain && (
          <button
            onClick={handleVerifyDomain}
            disabled={verifying}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {verifying ? "Verifying..." : "Verify DNS"}
          </button>
        )}
        {domainError && (
          <p className="text-sm text-destructive">{domainError}</p>
        )}
        {domainSuccess && (
          <p className="text-sm text-green-600">{domainSuccess}</p>
        )}
      </div>

      {/* GitHub Connection */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          GitHub Integration
        </h2>
        {project.githubRepo ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Connected to{" "}
              <code className="bg-accent px-1 py-0.5 rounded text-xs">
                {project.githubRepo}
              </code>{" "}
              (branch: {project.githubBranch})
            </p>
            <button
              onClick={async () => {
                await fetch(`/api/projects/${projectId}/github`, {
                  method: "DELETE",
                })
                setProject({ ...project, githubRepo: null, githubBranch: null })
              }}
              className="rounded-md border border-destructive/30 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Connect a GitHub repository to auto-deploy on push.
            </p>
            <a
              href={`https://github.com/apps/specra/installations/new?state=${projectId}`}
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Connect GitHub
            </a>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Deleting this project will stop all running deployments and remove all
          data. This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting..." : "Delete Project"}
        </button>
      </div>
    </div>
  )
}
