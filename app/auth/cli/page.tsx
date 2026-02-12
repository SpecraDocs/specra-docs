import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { randomBytes, createHash } from "crypto"

export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ port?: string; state?: string }>
}) {
  const { port, state } = await searchParams

  if (!port || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">Missing port or state parameter.</p>
      </div>
    )
  }

  const session = await auth()

  if (!session?.user?.id) {
    // Not logged in — redirect to login, then come back here
    const callbackUrl = `/auth/cli?port=${encodeURIComponent(port)}&state=${encodeURIComponent(state)}`
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  // User is logged in — generate an API token for the desktop app
  const rawToken = `specra_${randomBytes(32).toString("hex")}`
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")

  await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      name: "Specra Desktop App",
      tokenHash,
    },
  })

  // Redirect to the desktop app's local auth server
  const callbackUrl = `http://127.0.0.1:${port}/?token=${encodeURIComponent(rawToken)}&state=${encodeURIComponent(state)}`
  redirect(callbackUrl)
}
