import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { canAccessProject } from '$lib/server/auth-utils.js';
import { logAudit } from '$lib/server/audit.js';
import { removeRoute } from '$lib/server/caddy.js';
import { rm } from 'fs/promises';
import path from 'path';

const SITES_DIR = process.env.SITES_DIR || '/var/www/sites';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      deployments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      organization: true,
      _count: { select: { deployments: true, analyticsEvents: true } },
    },
  });

  if (!project) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json(project);
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canAccessProject(session.user.id, projectId))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, customDomain } = body;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(name && { name }),
      ...(customDomain !== undefined && { customDomain: customDomain || null }),
    },
  });

  logAudit({
    userId: session.user.id,
    action: 'PROJECT.UPDATE',
    target: projectId,
    metadata: { name, customDomain },
  });

  return json(project);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.userId !== session.user.id) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // Remove Caddy routes
  await removeRoute(`specra-${project.subdomain}`);
  if (project.customDomain) {
    await removeRoute(
      `specra-custom-${project.customDomain.replace(/\./g, '-')}`
    );
  }

  // Clean up site directory
  const siteDir = path.join(SITES_DIR, project.subdomain);
  try {
    await rm(siteDir, { recursive: true, force: true });
  } catch {
    // Non-fatal: directory may not exist
  }

  await prisma.project.delete({ where: { id: projectId } });

  logAudit({
    userId: session.user.id,
    action: 'PROJECT.DELETE',
    target: projectId,
    metadata: { name: project.name, slug: project.slug },
  });

  return json({ success: true });
};
