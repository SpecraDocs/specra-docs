import Docker from "dockerode"
import { prisma } from "@/lib/db"

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock",
})

const BASE_IMAGE = process.env.DOCS_BASE_IMAGE || "specra/docs-base:latest"
const PROJECTS_DIR = process.env.PROJECTS_DATA_DIR || "/data/specra/projects"
const PORT_MIN = 10000
const PORT_MAX = 60000

export async function allocatePort(): Promise<number> {
  const usedPorts = await prisma.deployment.findMany({
    where: { status: { in: ["RUNNING", "DEPLOYING"] }, port: { not: null } },
    select: { port: true },
  })
  const usedSet = new Set(usedPorts.map((d) => d.port))

  for (let port = PORT_MIN; port <= PORT_MAX; port++) {
    if (!usedSet.has(port)) return port
  }
  throw new Error("No available ports")
}

export async function createContainer(projectId: string, port: number) {
  const container = await docker.createContainer({
    Image: BASE_IMAGE,
    name: `specra-docs-${projectId}`,
    ExposedPorts: { "3000/tcp": {} },
    HostConfig: {
      PortBindings: {
        "3000/tcp": [{ HostPort: String(port) }],
      },
      Binds: [`${PROJECTS_DIR}/${projectId}:/data:ro`],
      RestartPolicy: { Name: "unless-stopped" },
      Memory: 256 * 1024 * 1024, // 256MB
      NanoCpus: 500000000, // 0.5 CPU
    },
    Env: [`PORT=3000`, `NODE_ENV=production`],
  })
  return container.id
}

export async function startContainer(containerId: string) {
  const container = docker.getContainer(containerId)
  await container.start()
}

export async function stopContainer(containerId: string) {
  try {
    const container = docker.getContainer(containerId)
    await container.stop({ t: 10 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes("not running")) throw err
  }
}

export async function removeContainer(containerId: string) {
  try {
    const container = docker.getContainer(containerId)
    await container.remove({ force: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes("No such container")) throw err
  }
}

export async function getContainerStatus(containerId: string) {
  try {
    const container = docker.getContainer(containerId)
    const info = await container.inspect()
    return {
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.StartedAt,
    }
  } catch {
    return { running: false, status: "removed", startedAt: null }
  }
}

export async function getContainerLogs(
  containerId: string,
  tail = 100
): Promise<string> {
  try {
    const container = docker.getContainer(containerId)
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    })
    return logs.toString()
  } catch {
    return ""
  }
}

export async function buildProjectImage(
  projectId: string
): Promise<string> {
  const builderContainer = await docker.createContainer({
    Image: "specra/docs-builder:latest",
    name: `specra-builder-${projectId}-${Date.now()}`,
    HostConfig: {
      Binds: [
        `${PROJECTS_DIR}/${projectId}/source:/source:ro`,
        `${PROJECTS_DIR}/${projectId}/build:/output`,
      ],
      Memory: 1024 * 1024 * 1024, // 1GB for builds
      NanoCpus: 2000000000, // 2 CPU
    },
  })

  await builderContainer.start()

  // Wait for build to complete
  const { StatusCode } = await builderContainer.wait()

  const logs = await builderContainer.logs({ stdout: true, stderr: true })
  const logStr = logs.toString()

  await builderContainer.remove()

  if (StatusCode !== 0) {
    throw new Error(`Build failed (exit ${StatusCode}):\n${logStr}`)
  }

  return logStr
}

export async function healthCheck(port: number, retries = 10): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/`, {
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) return true
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}
