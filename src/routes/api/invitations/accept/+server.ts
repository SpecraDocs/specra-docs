import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { getOrgSeatInfo } from '$lib/server/permissions.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await request.json();

  if (!token) {
    return json({ error: 'Token is required' }, { status: 400 });
  }

  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) {
    return json({ error: 'Invalid invitation' }, { status: 404 });
  }

  if (invitation.status !== 'PENDING') {
    return json(
      { error: 'Invitation is no longer valid' },
      { status: 400 }
    );
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    return json({ error: 'Invitation has expired' }, { status: 400 });
  }

  // Check email matches
  if (invitation.email !== session.user.email) {
    return json(
      { error: 'This invitation was sent to a different email address' },
      { status: 403 }
    );
  }

  // Check if already a member
  const existing = await prisma.organizationMember.findUnique({
    where: {
      userId_orgId: { userId: session.user.id, orgId: invitation.orgId },
    },
  });
  if (existing) {
    return json(
      { error: 'You are already a member of this organization' },
      { status: 409 }
    );
  }

  // Re-check seat limits (owner may have downgraded between invite and acceptance)
  const seatInfo = await getOrgSeatInfo(invitation.orgId);
  if (seatInfo && !seatInfo.canAddSeat) {
    return json(
      {
        error: 'Organization has reached its seat limit. Contact the org owner to add more seats.',
        code: 'SEAT_LIMIT_REACHED',
      },
      { status: 403 }
    );
  }

  // Accept: create membership and update invitation
  await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        userId: session.user.id,
        orgId: invitation.orgId,
        role: invitation.role,
      },
    }),
    prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    }),
  ]);

  return json({
    success: true,
    organization: invitation.organization,
  });
};
