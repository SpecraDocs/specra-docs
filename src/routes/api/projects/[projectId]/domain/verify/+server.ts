import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { verifyDomainDns, addCustomDomainRoute } from '$lib/server/caddy.js';

export const POST: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      deployments: {
        where: { status: 'RUNNING' },
        take: 1,
      },
    },
  });

  if (!project?.customDomain) {
    return json(
      { error: 'No custom domain set' },
      { status: 400 }
    );
  }

  const result = await verifyDomainDns(project.customDomain);

  if (!result.verified) {
    return json(
      { verified: false, error: result.error },
      { status: 200 }
    );
  }

  // If verified and there's a running deployment, add the Caddy route
  const runningDeploy = project.deployments[0];
  if (runningDeploy) {
    await addCustomDomainRoute(project.customDomain, project.subdomain);
  }

  return json({ verified: true });
};
