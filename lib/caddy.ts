const CADDY_ADMIN_URL = process.env.CADDY_ADMIN_URL || "http://localhost:2019"
const BASE_DOMAIN = process.env.DOCS_BASE_DOMAIN || "docs.specra.dev"

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

export async function addSubdomainRoute(subdomain: string, port: number) {
  const hostname = `${subdomain}.${BASE_DOMAIN}`
  const routeId = `specra-${subdomain}`

  const route = {
    "@id": routeId,
    match: [{ host: [hostname] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: `localhost:${port}` }],
      },
    ],
  }

  try {
    // Try to update existing route
    await caddyApi(`/id/${routeId}`, "PUT", route)
  } catch {
    // Add new route
    await caddyApi("/config/apps/http/servers/srv0/routes", "POST", route)
  }
}

export async function addCustomDomainRoute(domain: string, port: number) {
  const routeId = `specra-custom-${domain.replace(/\./g, "-")}`

  const route = {
    "@id": routeId,
    match: [{ host: [domain] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: `localhost:${port}` }],
      },
    ],
    terminal: true,
  }

  try {
    await caddyApi(`/id/${routeId}`, "PUT", route)
  } catch {
    await caddyApi("/config/apps/http/servers/srv0/routes", "POST", route)
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
  const expectedCname = `docs.specra.dev`

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
