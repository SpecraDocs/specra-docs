import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId, inviteId } = params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership || membership.role === 'MEMBER') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const invitation = await prisma.orgInvitation.findUnique({
    where: { id: inviteId },
  });
  if (!invitation || invitation.orgId !== orgId) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.orgInvitation.delete({ where: { id: inviteId } });

  return json({ success: true });
};
