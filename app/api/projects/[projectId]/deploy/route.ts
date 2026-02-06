import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canDeploy } from "@/lib/permissions"
import { deployProject } from "@/lib/deploy"
import { authenticateApiRequest } from "@/lib/api-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  // Support both session auth and API token auth (for CLI)
  let userId: string | null = null

  const session = await auth()
  if (session?.user?.id) {
    userId = session.user.id
  } else {
    const apiUser = await authenticateApiRequest(req)
    if (apiUser) userId = apiUser.id
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!(await canDeploy(userId, projectId))) {
    return NextResponse.json(
      { error: "Cannot deploy: check plan limits and project access" },
      { status: 403 }
    )
  }

  const contentType = req.headers.get("content-type") || ""

  let docsContent: Buffer
  let configJson: string | undefined
  let trigger: "MANUAL" | "CLI" | "GITHUB" = "MANUAL"
  let commitSha: string | undefined

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("archive") as File | null
    if (!file) {
      return NextResponse.json(
        { error: "No archive file provided" },
        { status: 400 }
      )
    }
    docsContent = Buffer.from(await file.arrayBuffer())
    configJson = formData.get("config")?.toString()
    trigger = (formData.get("trigger")?.toString() as typeof trigger) || "MANUAL"
    commitSha = formData.get("commitSha")?.toString()
  } else {
    docsContent = Buffer.from(await req.arrayBuffer())
    trigger = (req.headers.get("x-deploy-trigger") as typeof trigger) || "CLI"
    commitSha = req.headers.get("x-commit-sha") || undefined
  }

  try {
    const deploymentId = await deployProject(projectId, {
      docsContent,
      configJson,
      trigger,
      commitSha,
    })

    return NextResponse.json({ deploymentId }, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deploy failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
