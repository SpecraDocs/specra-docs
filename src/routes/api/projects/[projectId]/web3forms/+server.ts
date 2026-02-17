import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { canUseContactForm } from '$lib/server/permissions.js';
import { logAudit } from '$lib/server/audit.js';

export const PUT: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!(await canUseContactForm(session.user.id))) {
    return json({ error: 'Contact form requires Starter plan or above' }, { status: 403 });
  }

  const { accessKey } = await request.json();

  if (typeof accessKey !== 'string') {
    return json({ error: 'accessKey must be a string' }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { web3formsKey: accessKey || null },
  });

  logAudit({
    userId: session.user.id,
    action: 'PROJECT.CONTACT_FORM_UPDATE',
    target: projectId,
    metadata: { enabled: !!accessKey },
  });

  return json({ success: true, web3formsKey: project.web3formsKey });
};
