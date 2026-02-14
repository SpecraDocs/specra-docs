import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canDeploy } from '$lib/server/permissions.js';
import { deployProject } from '$lib/server/deploy.js';
import { authenticateApiRequest } from '$lib/server/api-auth.js';

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const { projectId } = params;

  // Support both session auth and API token auth (for CLI)
  let userId: string | null = null;

  const session = await locals.auth();
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    const apiUser = await authenticateApiRequest(request);
    if (apiUser) userId = apiUser.id;
  }

  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await canDeploy(userId, projectId))) {
    return json(
      { error: 'Cannot deploy: check plan limits and project access' },
      { status: 403 }
    );
  }

  const contentType = request.headers.get('content-type') || '';

  let docsContent: Buffer;
  let configJson: string | undefined;
  let trigger: 'MANUAL' | 'CLI' | 'GITHUB' = 'MANUAL';
  let commitSha: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('archive') as File | null;
    if (!file) {
      return json(
        { error: 'No archive file provided' },
        { status: 400 }
      );
    }
    docsContent = Buffer.from(await file.arrayBuffer());
    configJson = formData.get('config')?.toString();
    trigger = (formData.get('trigger')?.toString() as typeof trigger) || 'MANUAL';
    commitSha = formData.get('commitSha')?.toString();
  } else {
    docsContent = Buffer.from(await request.arrayBuffer());
    trigger = (request.headers.get('x-deploy-trigger') as typeof trigger) || 'CLI';
    commitSha = request.headers.get('x-commit-sha') || undefined;
  }

  try {
    const deploymentId = await deployProject(projectId, {
      docsContent,
      configJson,
      trigger,
      commitSha,
    });

    return json({ deploymentId }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deploy failed';
    return json({ error: message }, { status: 500 });
  }
};
