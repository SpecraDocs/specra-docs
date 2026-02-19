import { prisma } from "./db.js"

const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL || "http://localhost:2019"
const BASE_DOMAIN = process.env.DOCS_BASE_DOMAIN || "docs.specra-docs.com"
const CADDY_SERVER_NAME = process.env.CADDY_SERVER_NAME || "srv0"
const SITES_DIR = process.env.SITES_DIR || "/var/www/sites"

async function caddyApi(path: string, method: string, body?: unknown) {
  const res = await fetch(`${CADDY_ADMIN_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Caddy API error (${res.status}): ${text}`)
  }
  return res
}

export async function isCaddyAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${CADDY_ADMIN_URL}/config/`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function addSubdomainRoute(subdomain: string) {
  const hostname = `${subdomain}.${BASE_DOMAIN}`
  const routeId = `specra-${subdomain}`
  const root = `${SITES_DIR}/${subdomain}/current`

  const route = {
    "@id": routeId,
    match: [{ host: [hostname] }],
    handle: [
      {
        handler: "file_server",
        root: root,
      },
    ],
    terminal: true,
  }

  try {
    await caddyApi(`/id/${routeId}`, "PUT", route)
  } catch {
    await caddyApi(`/config/apps/http/servers/${CADDY_SERVER_NAME}/routes`, "POST", route)
  }
}

export async function addCustomDomainRoute(domain: string, subdomain: string) {
  const routeId = `specra-custom-${domain.replace(/\./g, "-")}`
  const root = `${SITES_DIR}/${subdomain}/current`

  const route = {
    "@id": routeId,
    match: [{ host: [domain] }],
    handle: [
      {
        handler: "file_server",
        root: root,
      },
    ],
    terminal: true,
  }

  try {
    await caddyApi(`/id/${routeId}`, "PUT", route)
  } catch {
    await caddyApi(`/config/apps/http/servers/${CADDY_SERVER_NAME}/routes`, "POST", route)
  }
}

export async function removeRoute(identifier: string) {
  try {
    await caddyApi(`/id/${identifier}`, "DELETE")
  } catch {
    // Route may not exist
  }
}

export async function verifyDomainDns(domain: string): Promise<{
  verified: boolean
  error?: string
}> {
  const { resolve } = await import("dns/promises")
  const expectedCname = BASE_DOMAIN

  try {
    // Check CNAME record
    const records = await resolve(domain, "CNAME")
    const hasCname = records.some(
      (r) => r.replace(/\.$/, "") === expectedCname
    )
    if (hasCname) return { verified: true }

    // Check TXT record as alternative
    const txtRecords = await resolve(domain, "TXT")
    const hasTxt = txtRecords.some((r) =>
      r.join("").includes("specra-verify=")
    )
    if (hasTxt) return { verified: true }

    return {
      verified: false,
      error: `No CNAME pointing to ${expectedCname} or specra-verify TXT record found`,
    }
  } catch {
    return { verified: false, error: `DNS lookup failed for ${domain}` }
  }
}

export async function syncAllRoutes() {
  const runningDeployments = await prisma.deployment.findMany({
    where: { status: "RUNNING" },
    include: { project: true },
  })

  for (const deployment of runningDeployments) {
    const { project } = deployment
    try {
      await addSubdomainRoute(project.subdomain)
      if (project.customDomain) {
        await addCustomDomainRoute(project.customDomain, project.subdomain)
      }
    } catch (err) {
      console.error(
        `Failed to sync Caddy route for ${project.subdomain}:`,
        err
      )
    }
  }
}
