import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { checkPlanLimits } from '$lib/server/permissions.js';
import { logAudit } from '$lib/server/audit.js';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { organization: { members: { some: { userId: session.user.id } } } },
      ],
    },
    include: {
      deployments: {
        where: { status: 'RUNNING' },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { deployments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return json(projects);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limits = await checkPlanLimits(session.user.id);
  if (!limits.canCreateProject) {
    return json(
      { error: `Project limit reached (${limits.maxProjects} max for ${limits.planSlug} plan)` },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, slug, orgId } = body;

  if (!name || !slug) {
    return json(
      { error: 'Name and slug are required' },
      { status: 400 }
    );
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return json(
      { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
      { status: 400 }
    );
  }

  // Validate org membership if orgId is provided
  if (orgId) {
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
    });
    if (!membership) {
      return json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }
  }

  // Check slug uniqueness
  const existing = await prisma.project.findFirst({
    where: { OR: [{ slug }, { subdomain: slug }] },
  });
  if (existing) {
    return json({ error: 'Slug already taken' }, { status: 409 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      subdomain: slug,
      userId: session.user.id,
      orgId: orgId || null,
    },
  });

  logAudit({
    userId: session.user.id,
    orgId: orgId || null,
    action: 'PROJECT.CREATE',
    target: project.id,
    metadata: { name, slug, orgId: orgId || null },
  });

  return json(project, { status: 201 });
};
