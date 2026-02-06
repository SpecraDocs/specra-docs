import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ApiTokenManager } from "./api-tokens"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium text-foreground">
              {session.user.name || "Not set"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{session.user.email}</p>
          </div>
        </div>
      </div>

      {/* API Tokens */}
      <ApiTokenManager initialTokens={tokens} />

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/30 bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
          disabled
        >
          Delete Account
        </button>
      </div>
    </div>
  )
}
