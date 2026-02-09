import Link from "next/link"
import { cookies } from "next/headers"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
import { getUserOrganizations } from "@/lib/auth-utils"
import { ArrowLeft } from "lucide-react"
import { DashboardNav } from "./components/dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const [userIsAdmin, memberships] = await Promise.all([
    session.user.id ? isAdmin(session.user.id) : Promise.resolve(false),
    session.user.id ? getUserOrganizations(session.user.id) : Promise.resolve([]),
  ])

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
  }))

  const cookieStore = await cookies()
  const scopeCookie = cookieStore.get("dashboard-scope")?.value ?? "personal"
  const currentScope =
    scopeCookie === "personal" || organizations.some((o) => o.id === scopeCookie)
      ? scopeCookie
      : "personal"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between px-6 mx-auto">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-semibold text-lg text-foreground">Specra</span>
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-sm font-medium text-muted-foreground">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server"
                const { signOut } = await import("@/auth")
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container px-6 mx-auto flex gap-8 py-8">
        <aside className="w-56 shrink-0">
          <DashboardNav
            isAdmin={userIsAdmin}
            organizations={organizations}
            currentScope={currentScope}
          />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
