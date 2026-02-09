"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Server,
  BarChart3,
  User,
} from "lucide-react"

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/deployments", label: "Deployments", icon: Server },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {adminNavItems.map((item) => {
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

      <div className="my-4 border-t border-border" />
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/30 whitespace-nowrap"
      >
        <User className="h-4 w-4 shrink-0" />
        Switch to User Dashboard
      </Link>
    </nav>
  )
}
