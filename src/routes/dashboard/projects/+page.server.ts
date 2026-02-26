import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';
import { checkPlanLimits } from '$lib/server/permissions.js';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const scope = cookies.get('dashboard-scope') ?? 'personal';

  // Build the where clause based on scope
  let whereClause: any;
  if (scope !== 'personal') {
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: scope } },
    });
    if (membership) {
      whereClause = { orgId: scope };
    }
  }

  // Default: personal projects only (orgId = null, owned by user)
  if (!whereClause) {
    whereClause = { userId: session.user.id, orgId: null };
  }

  const [projects, limits] = await Promise.all([
    prisma.project.findMany({
      where: whereClause,
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    checkPlanLimits(session.user.id),
  ]);

  const isOrgScope =
    scope !== 'personal' &&
    whereClause.orgId !== undefined &&
    'orgId' in whereClause &&
    whereClause.orgId === scope;

  const newProjectHref = isOrgScope
    ? `/dashboard/projects/new?orgId=${scope}`
    : '/dashboard/projects/new';

  return {
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      subdomain: p.subdomain,
      customDomain: p.customDomain,
      hidden: p.hidden,
      gracePeriodEndsAt: p.gracePeriodEndsAt?.toISOString() ?? null,
      organization: p.organization ? { name: p.organization.name } : null,
      latestDeployStatus: p.deployments[0]?.status || 'NO_DEPLOY',
    })),
    limits: {
      maxProjects: limits.maxProjects,
      canCreateProject: limits.canCreateProject,
      canDeploy: limits.canDeploy,
    },
    newProjectHref,
  };
};
