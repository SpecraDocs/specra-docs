import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { canUseChat } from '$lib/server/permissions.js';
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

  if (!(await canUseChat(session.user.id))) {
    return json({ error: 'Live chat requires Pro plan or above' }, { status: 403 });
  }

  const { enabled } = await request.json();

  if (typeof enabled !== 'boolean') {
    return json({ error: 'enabled must be a boolean' }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { chatEnabled: enabled },
  });

  logAudit({
    userId: session.user.id,
    action: 'PROJECT.CHAT_UPDATE',
    target: projectId,
    metadata: { enabled },
  });

  return json({ success: true, chatEnabled: project.chatEnabled });
};
