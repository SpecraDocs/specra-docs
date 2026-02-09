"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, User, Building2 } from "lucide-react"

export type ScopeOrg = {
  id: string
  name: string
}

export function ScopeSwitcher({
  organizations,
  currentScope,
}: {
  organizations: ScopeOrg[]
  currentScope: string
}) {
  const router = useRouter()
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

  const currentOrg = organizations.find((o) => o.id === currentScope)
  const label = currentOrg ? currentOrg.name : "Personal"

  function switchScope(scope: string) {
    document.cookie = `dashboard-scope=${scope};path=/;max-age=${60 * 60 * 24 * 365}`
    setOpen(false)
    router.refresh()
  }

  return (
    <div ref={ref} className="relative mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <span className="flex items-center gap-2 truncate">
          {currentOrg ? (
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-border bg-card shadow-lg">
          <button
            onClick={() => switchScope("personal")}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
              currentScope === "personal"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            Personal
          </button>
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => switchScope(org.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
                currentScope === org.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{org.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
