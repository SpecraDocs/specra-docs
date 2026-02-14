import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

async function getOrgMembership(userId: string, orgId: string) {
  return prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
}

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  const membership = await getOrgMembership(session.user.id, orgId);
  if (!membership) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      projects: { include: { deployments: { where: { status: 'RUNNING' }, take: 1 } } },
      _count: { select: { members: true, projects: true } },
    },
  });

  return json({ ...org, myRole: membership.role });
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  const membership = await getOrgMembership(session.user.id, orgId);
  if (!membership || membership.role === 'MEMBER') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, avatar } = await request.json();

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name && { name }),
      ...(avatar !== undefined && { avatar }),
    },
  });

  return json(org);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  const membership = await getOrgMembership(session.user.id, orgId);
  if (!membership || membership.role !== 'OWNER') {
    return json({ error: 'Only owners can delete organizations' }, { status: 403 });
  }

  await prisma.organization.delete({ where: { id: orgId } });

  return json({ success: true });
};
