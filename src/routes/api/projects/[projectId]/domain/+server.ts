import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { domain } = await request.json();

  if (!domain) {
    return json(
      { error: 'Domain is required' },
      { status: 400 }
    );
  }

  // Validate domain format
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return json(
      { error: 'Invalid domain format' },
      { status: 400 }
    );
  }

  // Check if domain is already in use
  const existing = await prisma.project.findFirst({
    where: { customDomain: domain, id: { not: projectId } },
  });
  if (existing) {
    return json(
      { error: 'Domain is already in use' },
      { status: 409 }
    );
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { customDomain: domain },
  });

  return json({
    project,
    dnsInstructions: {
      type: 'CNAME',
      name: domain,
      value: 'docs.specra.dev',
      note: 'Add this CNAME record in your DNS provider, then verify.',
    },
  });
};
