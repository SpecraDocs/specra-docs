import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { logAudit } from '$lib/server/audit.js';

export const GET: RequestHandler = async ({ locals, params, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');

  const where: Record<string, unknown> = { projectId };
  if (status === 'OPEN' || status === 'RESOLVED') where.status = status;
  if (type === 'FEEDBACK' || type === 'ISSUE') where.type = type;

  const items = await prisma.feedbackItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      resolver: { select: { id: true, name: true, email: true } },
    },
  });

  return json({ items });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, message, type } = body;

  if (!name || !email || !message) {
    return json({ error: 'name, email, and message are required' }, { status: 400 });
  }

  const item = await prisma.feedbackItem.create({
    data: {
      projectId,
      name: String(name),
      email: String(email),
      message: String(message),
      type: type === 'ISSUE' ? 'ISSUE' : 'FEEDBACK',
      source: 'ADMIN',
    },
  });

  logAudit({
    userId: session.user.id,
    action: 'FEEDBACK.CREATE',
    target: item.id,
    metadata: { projectId, type: item.type, source: 'ADMIN' },
  });

  return json({ item }, { status: 201 });
};
