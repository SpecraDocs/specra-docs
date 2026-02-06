"use client"

import { useState } from "react"

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Failed to open portal:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
    >
      {loading ? "Loading..." : "Manage Subscription"}
    </button>
  )
}
