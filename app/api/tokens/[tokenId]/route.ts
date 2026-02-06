import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { tokenId } = await params

  const token = await prisma.apiToken.findUnique({
    where: { id: tokenId },
  })

  if (!token || token.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.apiToken.delete({ where: { id: tokenId } })

  return NextResponse.json({ success: true })
}
