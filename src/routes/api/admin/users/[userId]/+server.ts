import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';
import { logAudit } from '$lib/server/audit.js';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' } },
      projects: { select: { id: true, name: true, subdomain: true } },
      organizationMembers: {
        include: { organization: { select: { id: true, name: true } } },
      },
      _count: { select: { payments: true, apiTokens: true } },
    },
  });

  if (!user) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json(user);
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = params;
  const { role, status } = await request.json();

  // Validate inputs
  if (role && !['USER', 'ADMIN'].includes(role)) {
    return json({ error: 'Invalid role' }, { status: 400 });
  }

  if (status && !['ACTIVE', 'BLOCKED'].includes(status)) {
    return json({ error: 'Invalid status' }, { status: 400 });
  }

  // Get the user being modified
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, status: true },
  });

  if (!targetUser) {
    return json({ error: 'User not found' }, { status: 404 });
  }

  const primaryAdminEmail = process.env.ADMIN_EMAIL;

  // Prevent blocking the primary admin
  if (
    primaryAdminEmail &&
    targetUser.email === primaryAdminEmail &&
    status === 'BLOCKED'
  ) {
    return json(
      { error: 'Cannot block primary admin user' },
      { status: 403 }
    );
  }

  // Prevent downgrading the primary admin from .env
  if (
    primaryAdminEmail &&
    targetUser.email === primaryAdminEmail &&
    role === 'USER'
  ) {
    return json(
      { error: 'Cannot downgrade primary admin user' },
      { status: 403 }
    );
  }

  // If downgrading from ADMIN to USER, ensure at least one admin remains
  if (role && targetUser.role === 'ADMIN' && role === 'USER') {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE' },
    });

    if (adminCount <= 1) {
      return json(
        { error: 'Cannot remove last admin. At least one admin must exist.' },
        { status: 403 }
      );
    }
  }

  // Prepare update data
  const updateData: { role?: 'USER' | 'ADMIN'; status?: 'ACTIVE' | 'BLOCKED' } = {};
  if (role) updateData.role = role;
  if (status) updateData.status = status;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  logAudit({
    userId: session.user.id,
    action: 'ADMIN.USER_UPDATE',
    target: userId,
    metadata: { role, status, oldRole: targetUser.role, oldStatus: targetUser.status },
  });

  // If blocking user, invalidate all their sessions
  if (status === 'BLOCKED') {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  return json(user);
};
