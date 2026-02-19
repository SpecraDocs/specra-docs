import { readdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { prisma } from "./db.js"
import { getUserSubscription } from "./auth-utils.js"
import { removeRoute, addSubdomainRoute, addCustomDomainRoute } from "./caddy.js"
import { logAudit } from "./audit.js"

const SITES_DIR = process.env.SITES_DIR || "/var/www/sites"

const BANNER_HTML = `<div id="specra-banner" style="position:fixed;bottom:0;left:0;right:0;background:#1a1a2e;color:#fff;text-align:center;padding:8px 16px;font-family:system-ui,sans-serif;font-size:13px;z-index:999999;box-shadow:0 -2px 8px rgba(0,0,0,0.15)">Powered by <a href="https://specra-docs.com" style="color:#6c63ff;text-decoration:underline" target="_blank">Specra</a></div>`

const BANNER_REGEX = /<div id="specra-banner"[^>]*>[\s\S]*?<\/div>/g

async function getHtmlFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(current: string) {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.name.endsWith(".html")) {
        files.push(full)
      }
    }
  }

  await walk(dir)
  return files
}

export async function injectBanner(siteDir: string): Promise<number> {
  const htmlFiles = await getHtmlFiles(siteDir)
  let modified = 0

  for (const file of htmlFiles) {
    const content = await readFile(file, "utf-8")
    if (content.includes('id="specra-banner"')) continue
    const updated = content.replace("</body>", `${BANNER_HTML}\n</body>`)
    if (updated !== content) {
      await writeFile(file, updated, "utf-8")
      modified++
    }
  }

  return modified
}

export async function removeBanner(siteDir: string): Promise<number> {
  const htmlFiles = await getHtmlFiles(siteDir)
  let modified = 0

  for (const file of htmlFiles) {
    const content = await readFile(file, "utf-8")
    if (!content.includes('id="specra-banner"')) continue
    const updated = content.replace(BANNER_REGEX, "").replace(/\n(<\/body>)/, "$1")
    await writeFile(file, updated, "utf-8")
    modified++
  }

  return modified
}

export async function enforceExpiredSubscriptions(): Promise<{
  enforced: number
  restored: number
  errors: string[]
}> {
  const results = { enforced: 0, restored: 0, errors: [] as string[] }

  // --- Enforce: projects with running deployments, no active sub, not yet enforced ---
  const projectsToEnforce = await prisma.project.findMany({
    where: {
      enforcedAt: null,
      deployments: { some: { status: "RUNNING" } },
      user: {
        subscriptions: {
          none: { status: { in: ["ACTIVE", "TRIALING"] } },
        },
      },
    },
    select: {
      id: true,
      subdomain: true,
      customDomain: true,
      userId: true,
    },
  })

  for (const project of projectsToEnforce) {
    try {
      const siteDir = join(SITES_DIR, project.subdomain, "current")
      const filesModified = await injectBanner(siteDir)

      if (project.customDomain) {
        const routeId = `specra-custom-${project.customDomain.replace(/\./g, "-")}`
        await removeRoute(routeId)
      }

      await prisma.project.update({
        where: { id: project.id },
        data: { enforcedAt: new Date() },
      })

      logAudit({
        userId: project.userId,
        action: "SUBSCRIPTION.ENFORCE",
        target: project.id,
        metadata: {
          subdomain: project.subdomain,
          customDomain: project.customDomain,
          filesModified,
        },
      })

      results.enforced++
    } catch (err) {
      results.errors.push(
        `Failed to enforce project ${project.id} (${project.subdomain}): ${err}`
      )
    }
  }

  // --- Restore: projects that were enforced but owner now has active sub ---
  const projectsToRestore = await prisma.project.findMany({
    where: {
      enforcedAt: { not: null },
      user: {
        subscriptions: {
          some: { status: { in: ["ACTIVE", "TRIALING"] } },
        },
      },
    },
    select: {
      id: true,
      subdomain: true,
      customDomain: true,
      userId: true,
    },
  })

  for (const project of projectsToRestore) {
    try {
      const siteDir = join(SITES_DIR, project.subdomain, "current")
      const filesModified = await removeBanner(siteDir)

      await addSubdomainRoute(project.subdomain)

      if (project.customDomain) {
        await addCustomDomainRoute(project.customDomain, project.subdomain)
      }

      await prisma.project.update({
        where: { id: project.id },
        data: { enforcedAt: null },
      })

      logAudit({
        userId: project.userId,
        action: "SUBSCRIPTION.RESTORE",
        target: project.id,
        metadata: {
          subdomain: project.subdomain,
          customDomain: project.customDomain,
          filesModified,
        },
      })

      results.restored++
    } catch (err) {
      results.errors.push(
        `Failed to restore project ${project.id} (${project.subdomain}): ${err}`
      )
    }
  }

  return results
}
