import { App } from "@octokit/app"
import { execSync } from "child_process"
import { mkdirSync, existsSync } from "fs"

let app: App | null = null

function getApp() {
  if (!app) {
    const appId = process.env.GITHUB_APP_ID
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET

    if (!appId || !privateKey) {
      throw new Error("GitHub App not configured")
    }

    app = new App({
      appId,
      privateKey,
      webhooks: { secret: webhookSecret || "" },
    })
  }
  return app
}

export async function getInstallationToken(
  installationId: number
): Promise<string> {
  const githubApp = getApp()
  const octokit = await githubApp.getInstallationOctokit(installationId)
  const { data } = await octokit.rest.apps.createInstallationAccessToken({
    installation_id: installationId,
  })
  return data.token
}

export async function cloneRepository(
  repoUrl: string,
  branch: string,
  token: string,
  targetDir: string
): Promise<void> {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  // Insert token into URL for auth
  const authedUrl = repoUrl.replace(
    "https://github.com/",
    `https://x-access-token:${token}@github.com/`
  )

  execSync(
    `git clone --depth 1 --branch ${branch} ${authedUrl} ${targetDir}`,
    { stdio: "pipe", timeout: 120000 }
  )
}

export function getWebhookApp() {
  return getApp()
}
