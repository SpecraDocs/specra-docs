import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { logAudit } from '$lib/server/audit.js';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, feedbackId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.feedbackItem.findFirst({
    where: { id: feedbackId, projectId },
  });

  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.type === 'ISSUE' || body.type === 'FEEDBACK') {
    data.type = body.type;
  }

  if (body.status === 'RESOLVED') {
    data.status = 'RESOLVED';
    data.resolvedAt = new Date();
    data.resolvedBy = session.user.id;
  } else if (body.status === 'OPEN') {
    data.status = 'OPEN';
    data.resolvedAt = null;
    data.resolvedBy = null;
  }

  const item = await prisma.feedbackItem.update({
    where: { id: feedbackId },
    data,
  });

  logAudit({
    userId: session.user.id,
    action: 'FEEDBACK.UPDATE',
    target: feedbackId,
    metadata: { projectId, changes: body },
  });

  return json({ item });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, feedbackId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.feedbackItem.findFirst({
    where: { id: feedbackId, projectId },
  });

  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.feedbackItem.delete({ where: { id: feedbackId } });

  logAudit({
    userId: session.user.id,
    action: 'FEEDBACK.DELETE',
    target: feedbackId,
    metadata: { projectId },
  });

  return json({ success: true });
};
