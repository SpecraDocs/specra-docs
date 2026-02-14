import geoip from "geoip-lite"
import { createHash } from "crypto"

interface GeoData {
  country: string | null
  region: string | null
  city: string | null
}

export function lookupIp(ip: string): GeoData {
  // Strip IPv6 prefix
  const cleanIp = ip.replace(/^::ffff:/, "")

  const geo = geoip.lookup(cleanIp)
  if (!geo) {
    return { country: null, region: null, city: null }
  }

  return {
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
  }
}

export function hashIp(ip: string): string {
  // Use daily salt for privacy — IPs can't be correlated across days
  const salt = new Date().toISOString().split("T")[0]
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 16)
}
