import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  })
}
