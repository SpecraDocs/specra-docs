import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { logAudit } from '$lib/server/audit.js';
import { getOrgSeatInfo } from '$lib/server/permissions.js';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const invitations = await prisma.orgInvitation.findMany({
    where: { orgId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  return json(invitations);
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership || membership.role === 'MEMBER') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, role } = await request.json();

  if (!email) {
    return json({ error: 'Email is required' }, { status: 400 });
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: existingUser.id, orgId } },
    });
    if (existingMember) {
      return json(
        { error: 'User is already a member' },
        { status: 409 }
      );
    }
  }

  // Check for pending invite
  const pending = await prisma.orgInvitation.findFirst({
    where: { orgId, email, status: 'PENDING' },
  });
  if (pending) {
    return json(
      { error: 'Invitation already pending' },
      { status: 409 }
    );
  }

  // Enforce seat limits
  const seatInfo = await getOrgSeatInfo(orgId);
  if (seatInfo && !seatInfo.canAddSeat) {
    return json(
      {
        error: 'Organization has reached its seat limit',
        code: 'SEAT_LIMIT_REACHED',
        seatInfo: {
          baseSeats: seatInfo.baseSeats,
          extraSeats: seatInfo.extraSeats,
          totalAllowedSeats: seatInfo.totalAllowedSeats,
          currentUsage: seatInfo.currentUsage,
          canBuyExtraSeats: seatInfo.canBuyExtraSeats,
        },
      },
      { status: 403 }
    );
  }

  const invitation = await prisma.orgInvitation.create({
    data: {
      orgId,
      email,
      role: role || 'MEMBER',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  logAudit({
    userId: session.user.id,
    orgId,
    action: 'ORG.INVITE',
    target: orgId,
    metadata: { email, role: role || 'MEMBER' },
  });

  // In production, send email with invitation link
  // For now, return the token
  return json(
    {
      ...invitation,
      inviteUrl: `${process.env.NEXTAUTH_URL || ''}/invitations/accept?token=${invitation.token}`,
    },
    { status: 201 }
  );
};
