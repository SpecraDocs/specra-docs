import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/db.js';
import { checkPlanLimits } from '$lib/server/permissions.js';
import { logAudit } from '$lib/server/audit.js';
import { resolveUserId } from '$lib/server/api-auth.js';
import { addSubdomainRoute, isCaddyAvailable } from '$lib/server/caddy.js';

export const GET: RequestHandler = async ({ locals, request }) => {
  const userId = await resolveUserId(locals, request);
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId },
        { organization: { members: { some: { userId } } } },
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
  const userId = await resolveUserId(locals, request);
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limits = await checkPlanLimits(userId);
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
      where: { userId_orgId: { userId: userId, orgId } },
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
    return json({ error: 'Subdomain already taken' }, { status: 409 });
  }

  // Create with try/catch to handle race conditions — the @unique
  // constraint on slug/subdomain is the true guard against duplicates.
  let project;
  try {
    project = await prisma.project.create({
      data: {
        name,
        slug,
        subdomain: slug,
        userId: userId,
        orgId: orgId || null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return json({ error: 'Subdomain already taken' }, { status: 409 });
    }
    throw e;
  }

  logAudit({
    userId: userId,
    orgId: orgId || null,
    action: 'PROJECT.CREATE',
    target: project.id,
    metadata: { name, slug, orgId: orgId || null },
  });

  // Pre-provision Caddy route so TLS cert is ready before first visit
  try {
    const caddyUp = await isCaddyAvailable();
    if (caddyUp) {
      await addSubdomainRoute(slug, userId);
    }
  } catch (err) {
    // Non-blocking — route will be created on first deployment
    console.error('Caddy pre-provision failed (non-blocking):', err);
  }

  return json(project, { status: 201 });
};
