import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { randomBytes, createHash } from "crypto"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  return NextResponse.json(tokens)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, expiresInDays } = await req.json()

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  // Generate token
  const rawToken = `specra_${randomBytes(32).toString("hex")}`
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000)
    : null

  await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      name,
      tokenHash,
      expiresAt,
    },
  })

  // Return the raw token only once - it cannot be retrieved again
  return NextResponse.json({ token: rawToken, name, expiresAt }, { status: 201 })
}
