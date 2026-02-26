import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { isAdmin } from '$lib/server/permissions.js';
import { logAudit } from '$lib/server/audit.js';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const recipients = await prisma.notificationRecipient.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return json({ recipients });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, name } = body;

  if (!email || typeof email !== 'string') {
    return json({ error: 'Email is required' }, { status: 400 });
  }

  const existing = await prisma.notificationRecipient.findUnique({
    where: { email },
  });

  if (existing) {
    return json({ error: 'A recipient with this email already exists' }, { status: 409 });
  }

  const recipient = await prisma.notificationRecipient.create({
    data: {
      email: email.trim().toLowerCase(),
      name: name?.trim() || null,
    },
  });

  logAudit({
    userId: session.user.id,
    action: 'NOTIFICATION_RECIPIENT.CREATE',
    target: recipient.id,
    metadata: { email: recipient.email },
  });

  return json({ recipient }, { status: 201 });
};
