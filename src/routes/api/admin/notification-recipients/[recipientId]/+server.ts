import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { isAdmin } from '$lib/server/permissions.js';
import { logAudit } from '$lib/server/audit.js';

export const PATCH: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { recipientId } = params;

  const existing = await prisma.notificationRecipient.findUnique({
    where: { id: recipientId },
  });

  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const recipient = await prisma.notificationRecipient.update({
    where: { id: recipientId },
    data: { active: !existing.active },
  });

  logAudit({
    userId: session.user.id,
    action: 'NOTIFICATION_RECIPIENT.TOGGLE',
    target: recipientId,
    metadata: { email: recipient.email, active: recipient.active },
  });

  return json({ recipient });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { recipientId } = params;

  const existing = await prisma.notificationRecipient.findUnique({
    where: { id: recipientId },
  });

  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.notificationRecipient.delete({ where: { id: recipientId } });

  logAudit({
    userId: session.user.id,
    action: 'NOTIFICATION_RECIPIENT.DELETE',
    target: recipientId,
    metadata: { email: existing.email },
  });

  return json({ success: true });
};
