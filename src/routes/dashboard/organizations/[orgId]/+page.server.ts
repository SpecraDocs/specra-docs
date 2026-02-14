import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const { orgId } = params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership) error(404, 'Not found');

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        take: 5,
      },
      projects: {
        include: {
          deployments: {
            where: { status: 'RUNNING' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { members: true, projects: true } },
    },
  });

  if (!org) error(404, 'Not found');

  return {
    membership: { role: membership.role },
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      _count: org._count,
      members: org.members.map((m) => ({
        id: m.id,
        role: m.role,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        },
      })),
      projects: org.projects.map((p) => ({
        id: p.id,
        name: p.name,
        subdomain: p.subdomain,
        hasRunningDeployment: p.deployments.length > 0,
      })),
    },
  };
};
