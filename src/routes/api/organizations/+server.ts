import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { getUserSubscription } from '$lib/server/auth-utils.js';
import { logAudit } from '$lib/server/audit.js';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return json(
    memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }))
  );
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Orgs require Pro+ plan
  const subscription = await getUserSubscription(session.user.id);
  const planSlug = subscription?.plan.slug;
  if (!planSlug || (planSlug !== 'pro' && planSlug !== 'enterprise')) {
    return json(
      { error: 'Organizations require a Pro or Enterprise plan' },
      { status: 403 }
    );
  }

  const { name, slug } = await request.json();

  if (!name || !slug) {
    return json(
      { error: 'Name and slug are required' },
      { status: 400 }
    );
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return json(
      { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
      { status: 400 }
    );
  }

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return json({ error: 'Slug already taken' }, { status: 409 });
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
        },
      },
    },
    include: { _count: { select: { members: true, projects: true } } },
  });

  logAudit({
    userId: session.user.id,
    orgId: org.id,
    action: 'ORG.CREATE',
    target: org.id,
    metadata: { name, slug },
  });

  return json(org, { status: 201 });
};
