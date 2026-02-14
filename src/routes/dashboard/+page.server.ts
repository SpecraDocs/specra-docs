import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserSubscription } from '$lib/server/auth-utils.js';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const scope = cookies.get('dashboard-scope') ?? 'personal';

  const [subscription, userIsAdmin] = await Promise.all([
    getUserSubscription(session.user.id),
    isAdmin(session.user.id),
  ]);

  // Count projects based on scope
  let projectCount: number;
  if (scope !== 'personal') {
    const membership = await prisma.organizationMember.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: scope } },
    });
    if (membership) {
      projectCount = await prisma.project.count({ where: { orgId: scope } });
    } else {
      projectCount = await prisma.project.count({
        where: { userId: session.user.id, orgId: null },
      });
    }
  } else {
    projectCount = await prisma.project.count({
      where: { userId: session.user.id, orgId: null },
    });
  }

  return {
    session,
    subscription: subscription
      ? {
          plan: { name: subscription.plan.name },
          interval: subscription.interval,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
    userIsAdmin,
    projectCount,
  };
};
