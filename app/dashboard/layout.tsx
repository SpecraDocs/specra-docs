import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
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

  const userIsAdmin = session.user.id ? await isAdmin(session.user.id) : false

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
            {/* {userIsAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors border border-destructive/30"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            )} */}
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
          <DashboardNav isAdmin={userIsAdmin} />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
