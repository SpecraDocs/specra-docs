import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { lookupIp, hashIp } from "@/lib/geo"

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100 // max events per IP per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}, 60000)

function parseUserAgent(ua: string) {
  let browser = "Unknown"
  let os = "Unknown"
  let device = "Desktop"

  // Browser detection
  if (ua.includes("Firefox/")) browser = "Firefox"
  else if (ua.includes("Edg/")) browser = "Edge"
  else if (ua.includes("Chrome/")) browser = "Chrome"
  else if (ua.includes("Safari/")) browser = "Safari"
  else if (ua.includes("Opera/") || ua.includes("OPR/")) browser = "Opera"

  // OS detection
  if (ua.includes("Windows")) os = "Windows"
  else if (ua.includes("Mac OS")) os = "macOS"
  else if (ua.includes("Linux")) os = "Linux"
  else if (ua.includes("Android")) os = "Android"
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad"))
    os = "iOS"

  // Device detection
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile"
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "Tablet"

  return { browser, os, device }
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"

    if (isRateLimited(ip)) {
      return new NextResponse(null, { status: 429 })
    }

    const body = await req.json()
    const { projectId, sessionId, path, referrer, duration, scrollDepth } = body

    if (!projectId || !sessionId || !path) {
      return new NextResponse(null, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })
    if (!project) {
      return new NextResponse(null, { status: 404 })
    }

    const ua = req.headers.get("user-agent") || ""
    const { browser, os, device } = parseUserAgent(ua)
    const geo = lookupIp(ip)
    const ipHashed = hashIp(ip)

    await prisma.analyticsEvent.create({
      data: {
        projectId,
        sessionId,
        path,
        referrer: referrer || null,
        browser,
        os,
        device,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        ipHash: ipHashed,
        scrollDepth: scrollDepth ?? null,
        duration: duration ?? null,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
