"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  FolderGit2,
  BarChart3,
  Building2,
  Shield,
} from "lucide-react"
import { ScopeSwitcher, type ScopeOrg } from "./scope-switcher"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/organizations", label: "Organizations", icon: Building2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardNav({
  isAdmin,
  organizations,
  currentScope,
}: {
  isAdmin: boolean
  organizations: ScopeOrg[]
  currentScope: string
}) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      <ScopeSwitcher organizations={organizations} currentScope={currentScope} />

      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}

      {isAdmin && (
        <>
          <div className="my-4 border-t border-border" />
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors border border-blue-500/30"
          >
            <Shield className="h-4 w-4" />
            Switch to Admin Panel
          </Link>
        </>
      )}
    </nav>
  )
}
