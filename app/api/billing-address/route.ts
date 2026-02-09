import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const billingAddress = await prisma.billingAddress.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json({ billingAddress })
  } catch (error) {
    console.error("Get billing address error:", error)
    return NextResponse.json({ error: "Failed to get billing address" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { address, city, state, country, postalCode, taxPin } = await req.json()

    if (!address || !city || !country) {
      return NextResponse.json(
        { error: "address, city, and country are required" },
        { status: 400 }
      )
    }

    const billingAddress = await prisma.billingAddress.upsert({
      where: { userId: session.user.id },
      update: { address, city, state, country, postalCode, taxPin },
      create: {
        userId: session.user.id,
        address,
        city,
        state,
        country,
        postalCode,
        taxPin,
      },
    })

    return NextResponse.json({ billingAddress })
  } catch (error) {
    console.error("Update billing address error:", error)
    return NextResponse.json({ error: "Failed to update billing address" }, { status: 500 })
  }
}
