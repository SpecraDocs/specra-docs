"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [orgName, setOrgName] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No invitation token provided.")
      return
    }

    fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus("success")
          setOrgName(data.organization?.name || "the organization")
        } else {
          setStatus("error")
          setMessage(data.error || "Failed to accept invitation")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Something went wrong")
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full rounded-lg border border-border bg-card p-8 text-center">
        {status === "loading" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Accepting Invitation...
            </h1>
            <p className="text-muted-foreground">Please wait.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Welcome to {orgName}!
            </h1>
            <p className="text-muted-foreground mb-6">
              You&apos;ve been added to the organization.
            </p>
            <Link
              href="/dashboard/organizations"
              className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Go to Organizations
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-destructive mb-2">
              Invitation Error
            </h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
