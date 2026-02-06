"use client"

import { useState } from "react"
import { Key, Plus, Trash2, Copy } from "lucide-react"

interface Token {
  id: string
  name: string
  lastUsed: string | null
  expiresAt: string | null
  createdAt: string
}

export function ApiTokenManager({
  initialTokens,
}: {
  initialTokens: Token[]
}) {
  const [tokens, setTokens] = useState<Token[]>(initialTokens)
  const [showCreate, setShowCreate] = useState(false)
  const [tokenName, setTokenName] = useState("")
  const [newToken, setNewToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function createToken(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tokenName, expiresInDays: 90 }),
    })

    if (res.ok) {
      const data = await res.json()
      setNewToken(data.token)
      setTokenName("")
      setShowCreate(false)

      // Refresh token list
      const listRes = await fetch("/api/tokens")
      if (listRes.ok) setTokens(await listRes.json())
    }

    setCreating(false)
  }

  async function deleteToken(id: string) {
    if (!confirm("Delete this API token? Any applications using it will stop working.")) return

    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" })
    if (res.ok) {
      setTokens(tokens.filter((t) => t.id !== id))
    }
  }

  function copyToken() {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Tokens</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tokens for CLI authentication and API access
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Token
        </button>
      </div>

      {/* New token created banner */}
      {newToken && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 space-y-2">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Token created! Copy it now — it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 text-xs font-mono text-foreground break-all">
              {newToken}
            </code>
            <button
              onClick={copyToken}
              className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setNewToken(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createToken} className="flex gap-2">
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Token name (e.g. My Laptop)"
            required
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            type="submit"
            disabled={creating || !tokenName}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No API tokens yet. Create one to use the Specra CLI.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {token.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(token.createdAt).toLocaleDateString()}
                    {token.lastUsed && (
                      <> &middot; Last used {new Date(token.lastUsed).toLocaleDateString()}</>
                    )}
                    {token.expiresAt && (
                      <> &middot; Expires {new Date(token.expiresAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteToken(token.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
