import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { logAudit } from '$lib/server/audit.js';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId, memberId } = params;

  const myMembership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!myMembership || myMembership.role === 'MEMBER') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { role } = await request.json();

  if (!['ADMIN', 'MEMBER'].includes(role)) {
    return json({ error: 'Invalid role' }, { status: 400 });
  }

  // Can't change owner's role
  const target = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });
  if (!target || target.orgId !== orgId) {
    return json({ error: 'Not found' }, { status: 404 });
  }
  if (target.role === 'OWNER') {
    return json({ error: "Cannot change owner's role" }, { status: 400 });
  }

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  logAudit({
    userId: session.user.id,
    orgId,
    action: 'ORG.MEMBER_ROLE_CHANGE',
    target: orgId,
    metadata: { memberId, oldRole: target.role, newRole: role },
  });

  return json(updated);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId, memberId } = params;

  const myMembership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });

  const target = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });
  if (!target || target.orgId !== orgId) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  // Members can remove themselves, admins/owners can remove others
  const isSelf = target.userId === session.user.id;
  const isAdmin = myMembership && myMembership.role !== 'MEMBER';

  if (!isSelf && !isAdmin) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  if (target.role === 'OWNER') {
    return json({ error: 'Cannot remove the owner' }, { status: 400 });
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  logAudit({
    userId: session.user.id,
    orgId,
    action: 'ORG.MEMBER_REMOVE',
    target: orgId,
    metadata: { memberId, removedUserId: target.userId, selfRemoval: isSelf },
  });

  return json({ success: true });
};
