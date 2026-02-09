import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 50

    const [configs, total] = await Promise.all([
      prisma.taxConfig.findMany({
        orderBy: { country: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.taxConfig.count(),
    ])

    return NextResponse.json({
      configs,
      pagination: { page, totalPages: Math.ceil(total / limit), total },
    })
  } catch (error) {
    console.error("List tax configs error:", error)
    return NextResponse.json({ error: "Failed to list tax configs" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { country, rate, name } = await req.json()

    if (!country || rate === undefined || !name) {
      return NextResponse.json(
        { error: "country, rate, and name are required" },
        { status: 400 }
      )
    }

    const existing = await prisma.taxConfig.findUnique({
      where: { country: country.toUpperCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Tax config for this country already exists" },
        { status: 409 }
      )
    }

    const config = await prisma.taxConfig.create({
      data: {
        country: country.toUpperCase(),
        rate: parseFloat(rate),
        name,
      },
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error("Create tax config error:", error)
    return NextResponse.json({ error: "Failed to create tax config" }, { status: 500 })
  }
}
