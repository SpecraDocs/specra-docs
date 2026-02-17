import { prisma } from "./db.js"
import {
  allocatePort,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
  buildProjectImage,
  healthCheck,
} from "./docker.js"
import { addSubdomainRoute, addCustomDomainRoute } from "./caddy.js"
import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"

const PROJECTS_DIR = process.env.PROJECTS_DATA_DIR || "/data/specra/projects"

interface DeployOptions {
  docsContent: Buffer
  configJson?: string
  trigger: "MANUAL" | "CLI" | "GITHUB"
  commitSha?: string
}

function buildEmbedScripts(project: { id: string; web3formsKey: string | null; chatEnabled: boolean }): string {
  let scripts = ""
  const baseUrl = process.env.PUBLIC_BASE_URL || "https://specra.dev"

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
    // 2. Extract docs to project directory
    await updateStatus(deployment.id, "BUILDING")
    const projectDir = path.join(PROJECTS_DIR, projectId)
    const sourceDir = path.join(projectDir, "source")
    await mkdir(sourceDir, { recursive: true })

    // Extract tar.gz content
    const tar = await import("tar")
    const { Readable } = await import("stream")
    const stream = Readable.from(options.docsContent)
    await stream.pipe(tar.extract({ cwd: sourceDir, strip: 1 }))

    if (options.configJson) {
      await writeFile(
        path.join(sourceDir, "specra.config.json"),
        options.configJson
      )
    }

    // 2b. Inject embed scripts (contact form, chat widget)
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

    // 3. Stop existing container if running
    const existingDeployment = await prisma.deployment.findFirst({
      where: {
        projectId,
        status: "RUNNING",
        id: { not: deployment.id },
      },
    })

    if (existingDeployment?.containerId) {
      await stopContainer(existingDeployment.containerId)
      await removeContainer(existingDeployment.containerId)
      await prisma.deployment.update({
        where: { id: existingDeployment.id },
        data: { status: "STOPPED" },
      })
    }

    // 4. Build project
    buildLogs += await buildProjectImage(projectId)

    // 5. Create and start container (DEPLOYING)
    await updateStatus(deployment.id, "DEPLOYING")
    const port = await allocatePort()
    const containerId = await createContainer(projectId, port)
    await startContainer(containerId)

    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { containerId, port },
    })

    // 6. Register Caddy routes
    await addSubdomainRoute(project.subdomain, port)
    if (project.customDomain) {
      await addCustomDomainRoute(project.customDomain, port)
    }

    // 7. Health check -> RUNNING or FAILED
    const healthy = await healthCheck(port)
    if (!healthy) {
      throw new Error("Health check failed after deployment")
    }

    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: "RUNNING", buildLogs },
    })

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
