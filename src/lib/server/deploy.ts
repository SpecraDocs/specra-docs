import { prisma } from "./db.js"
import { buildProjectImage } from "./builder.js"
import { addSubdomainRoute, addCustomDomainRoute } from "./caddy.js"
import { mkdir, readFile, writeFile, symlink, rename, readlink, readdir, rm } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const PROJECTS_DIR = process.env.PROJECTS_DATA_DIR || "/data/specra/projects"
const SITES_DIR = process.env.SITES_DIR || "/var/www/sites"
const MAX_RELEASES = 5

interface DeployOptions {
  docsContent: Buffer
  configJson?: string
  trigger: "MANUAL" | "CLI" | "GITHUB"
  commitSha?: string
  preBuilt?: boolean
}

function buildEmbedScripts(project: { id: string; web3formsKey: string | null; chatEnabled: boolean }): string {
  let scripts = ""
  const baseUrl = process.env.PUBLIC_BASE_URL || "https://specra-docs.com"

  if (project.web3formsKey) {
    scripts += `<script src="${baseUrl}/embed/contact-form.js" data-project-id="${project.id}" defer><\/script>\n`
  }

  if (project.chatEnabled) {
    scripts += `<script src="${baseUrl}/embed/chat-widget.js" data-project-id="${project.id}" defer><\/script>\n`
  }

  return scripts
}

export async function deployProject(projectId: string, options: DeployOptions) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  })

  // 1. Create Deployment record (QUEUED)
  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      status: "QUEUED",
      trigger: options.trigger,
      commitSha: options.commitSha,
    },
  })

  let buildLogs = ""

  try {
    // 2. Save archive for rollback
    const projectDir = path.join(PROJECTS_DIR, projectId)
    const archivesDir = path.join(projectDir, "archives")
    await mkdir(archivesDir, { recursive: true })
    const archiveFilename = `${deployment.id}.tar.gz`
    await writeFile(path.join(archivesDir, archiveFilename), options.docsContent)
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { archivePath: `archives/${archiveFilename}` },
    })

    // 3. Extract docs to project directory
    await updateStatus(deployment.id, "BUILDING")
    const sourceDir = path.join(projectDir, "source")
    await mkdir(sourceDir, { recursive: true })

    // Extract tar.gz content
    const tar = await import("tar")
    const { Readable } = await import("stream")
    const { pipeline } = await import("stream/promises")

    if (options.docsContent.length === 0) {
      throw new Error("Empty archive — nothing to deploy")
    }

    const stream = Readable.from(options.docsContent)
    await pipeline(stream, tar.extract({ cwd: sourceDir, strip: 1 }))

    if (options.configJson) {
      await writeFile(
        path.join(sourceDir, "specra.config.json"),
        options.configJson
      )
    }

    // 3b. Inject embed scripts (contact form, chat widget)
    const embedScripts = buildEmbedScripts(project)
    if (embedScripts) {
      const appHtmlPath = path.join(sourceDir, "src", "app.html")
      try {
        let html = await readFile(appHtmlPath, "utf-8")
        html = html.replace("</body>", `${embedScripts}</body>`)
        await writeFile(appHtmlPath, html)
      } catch {
        // app.html may not exist in all project types, skip silently
      }
    }

    // 4. Build if not pre-built
    if (!options.preBuilt) {
      buildLogs += await buildProjectImage(projectId)
    } else {
      buildLogs += "Skipping build (pre-built content)\n"
    }

    // 5. Deploy to sites directory
    await updateStatus(deployment.id, "DEPLOYING")

    const siteDir = path.join(SITES_DIR, project.subdomain)
    const releasesDir = path.join(siteDir, "releases")
    const releaseDir = path.join(releasesDir, deployment.id)
    const currentLink = path.join(siteDir, "current")

    await mkdir(releaseDir, { recursive: true })

    // Copy build output to release directory
    const buildDir = options.preBuilt ? sourceDir : path.join(projectDir, "build")
    const { cp } = await import("fs/promises")
    await cp(buildDir, releaseDir, { recursive: true })

    // Verify index.html exists
    const indexPath = path.join(releaseDir, "index.html")
    if (!existsSync(indexPath)) {
      throw new Error("Build output missing index.html")
    }

    // 6. Atomic symlink swap
    const tempLink = `${currentLink}.tmp-${deployment.id}`
    await symlink(releaseDir, tempLink)
    await rename(tempLink, currentLink)

    buildLogs += `Deployed to ${releaseDir}\n`

    // 7. Mark previous RUNNING deployments as STOPPED
    await prisma.deployment.updateMany({
      where: {
        projectId,
        status: "RUNNING",
        id: { not: deployment.id },
      },
      data: { status: "STOPPED" },
    })

    // 8. Register Caddy routes
    await addSubdomainRoute(project.subdomain)
    if (project.customDomain) {
      await addCustomDomainRoute(project.customDomain, project.subdomain)
    }

    // 9. Mark as RUNNING
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: "RUNNING",
        buildPath: releaseDir,
        buildLogs,
      },
    })

    // 10. Clean up old releases (keep last MAX_RELEASES)
    await cleanupOldReleases(releasesDir, currentLink)

    return deployment.id
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    buildLogs += `\nERROR: ${errorMsg}`
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "FAILED", buildLogs },
    })
    throw err
  }
}

async function updateStatus(
  deploymentId: string,
  status: "BUILDING" | "DEPLOYING"
) {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status },
  })
}

async function cleanupOldReleases(releasesDir: string, currentLink: string) {
  try {
    const currentTarget = await readlink(currentLink)
    const releases = await readdir(releasesDir)

    // Sort by directory name (cuid is sortable by creation time)
    const sorted = releases.sort()

    if (sorted.length <= MAX_RELEASES) return

    const toRemove = sorted.slice(0, sorted.length - MAX_RELEASES)
    for (const release of toRemove) {
      const releasePath = path.join(releasesDir, release)
      // Never remove the currently active release
      if (releasePath === currentTarget) continue
      await rm(releasePath, { recursive: true, force: true })
    }
  } catch {
    // Non-fatal: cleanup failure shouldn't break deployment
  }
}
