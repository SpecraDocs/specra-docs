/**
 * Global rate limiting middleware for SvelteKit hooks.
 *
 * Tiers:
 *  - Auth endpoints (/api/auth/*): 20 req/min  (brute-force protection)
 *  - Payment webhooks (/api/webhooks/*): 60 req/min
 *  - API routes (/api/*): 60 req/min
 *  - Page routes: 120 req/min
 *
 * Suspicious-request detection:
 *  - Known scanner paths (.env, wp-admin, phpMyAdmin, etc.) → instant 403
 *  - Repeat offenders (3+ blocked requests) → IP banned for 10 min
 */

interface RateBucket {
  count: number
  resetAt: number
}

interface BanEntry {
  until: number
  reason: string
}

const ipBuckets = new Map<string, RateBucket>()
const bannedIps = new Map<string, BanEntry>()

// Suspicious paths that indicate scanners / bots
const SCANNER_PATTERNS = [
  /\/\.env/,
  /\/\.git/,
  /\/wp-(admin|login|content|includes)/,
  /\/phpMyAdmin/i,
  /\/phpmyadmin/i,
  /\/administrator/,
  /\/xmlrpc\.php/,
  /\/wp-login\.php/,
  /\/config\.(php|bak|old)/,
  /\/\.well-known\/?(security\.txt)?$/, // allow .well-known but not probing
  /\/cgi-bin/,
  /\/eval-stdin/,
  /\/telescope/,
  /\/debug\/(default|pprof)/,
  /\/actuator/,
  /\/console/,
  /\/solr/,
  /\/vendor\//,
  /\/backup/i,
  /\/(shell|cmd|command)\b/i,
]

const BAN_DURATION = 10 * 60 * 1000 // 10 minutes
const SCANNER_THRESHOLD = 3 // hits before ban

// Track scanner hits per IP for escalation
const scannerHits = new Map<string, { count: number; firstSeen: number }>()

function getClientIp(request: Request, getClientAddress: () => string): string {
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  try {
    return getClientAddress()
  } catch {
    return "unknown"
  }
}

function bucketKey(ip: string, tier: string): string {
  return `${ip}:${tier}`
}

function getTier(pathname: string): { name: string; limit: number; window: number } {
  if (pathname.startsWith("/api/auth/")) {
    return { name: "auth", limit: 20, window: 60_000 }
  }
  if (pathname.startsWith("/api/webhooks/")) {
    return { name: "webhook", limit: 60, window: 60_000 }
  }
  if (pathname.startsWith("/api/")) {
    return { name: "api", limit: 60, window: 60_000 }
  }
  return { name: "page", limit: 120, window: 60_000 }
}

function isScannerPath(pathname: string): boolean {
  return SCANNER_PATTERNS.some((p) => p.test(pathname))
}

function recordScannerHit(ip: string): boolean {
  const now = Date.now()
  const entry = scannerHits.get(ip)

  if (!entry || now - entry.firstSeen > BAN_DURATION) {
    scannerHits.set(ip, { count: 1, firstSeen: now })
    return false
  }

  entry.count++
  if (entry.count >= SCANNER_THRESHOLD) {
    bannedIps.set(ip, { until: now + BAN_DURATION, reason: "scanner" })
    scannerHits.delete(ip)
    return true
  }
  return false
}

function isRateLimited(ip: string, pathname: string): {
  limited: boolean
  remaining: number
  limit: number
  retryAfter?: number
} {
  const tier = getTier(pathname)
  const key = bucketKey(ip, tier.name)
  const now = Date.now()

  const entry = ipBuckets.get(key)

  if (!entry || now > entry.resetAt) {
    ipBuckets.set(key, { count: 1, resetAt: now + tier.window })
    return { limited: false, remaining: tier.limit - 1, limit: tier.limit }
  }

  entry.count++

  if (entry.count > tier.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { limited: true, remaining: 0, limit: tier.limit, retryAfter }
  }

  return { limited: false, remaining: tier.limit - entry.count, limit: tier.limit }
}

export interface RateLimitResult {
  blocked: boolean
  response?: Response
}

export function checkRateLimit(
  request: Request,
  getClientAddress: () => string
): RateLimitResult {
  const ip = getClientIp(request, getClientAddress)
  const url = new URL(request.url)
  const pathname = url.pathname

  // Skip rate limiting for static assets
  if (
    pathname.startsWith("/_app/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/)
  ) {
    return { blocked: false }
  }

  // Check ban list
  const ban = bannedIps.get(ip)
  if (ban) {
    if (Date.now() > ban.until) {
      bannedIps.delete(ip)
    } else {
      return {
        blocked: true,
        response: new Response("Forbidden", {
          status: 403,
          headers: { "Retry-After": String(Math.ceil((ban.until - Date.now()) / 1000)) },
        }),
      }
    }
  }

  // Scanner detection
  if (isScannerPath(pathname)) {
    const banned = recordScannerHit(ip)
    return {
      blocked: true,
      response: new Response(banned ? "Forbidden" : "Not Found", {
        status: banned ? 403 : 404,
      }),
    }
  }

  // Rate limit check
  const result = isRateLimited(ip, pathname)
  if (result.limited) {
    return {
      blocked: true,
      response: new Response("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter ?? 60),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      }),
    }
  }

  return { blocked: false }
}

// Periodic cleanup — every 2 minutes
setInterval(() => {
  const now = Date.now()

  for (const [key, entry] of ipBuckets) {
    if (now > entry.resetAt) ipBuckets.delete(key)
  }

  for (const [ip, ban] of bannedIps) {
    if (now > ban.until) bannedIps.delete(ip)
  }

  for (const [ip, entry] of scannerHits) {
    if (now - entry.firstSeen > BAN_DURATION) scannerHits.delete(ip)
  }
}, 120_000)
