import Docker from "dockerode"

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock",
})

const PROJECTS_DIR = process.env.PROJECTS_DATA_DIR || "/data/specra/projects"

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
