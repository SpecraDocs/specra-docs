import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/permissions"
import { ArrowLeft } from "lucide-react"
import { AdminNav } from "./components/admin-nav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const admin = await isAdmin(session.user.id)
  if (!admin) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-destructive/5">
        <div className="container flex h-16 items-center justify-between px-6 mx-auto">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-semibold text-lg text-foreground">
                Specra
              </span>
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-sm font-medium text-destructive">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            {/* <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors border border-primary/30"
            >
              <User className="h-4 w-4" />
              User Dashboard
            </Link> */}
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
          </div>
        </div>
      </header>

      <div className="container px-6 mx-auto flex gap-8 py-8">
        <aside className="w-56 shrink-0">
          <AdminNav />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
