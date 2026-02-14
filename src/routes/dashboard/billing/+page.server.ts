import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';
import { getUserSubscription } from '$lib/server/auth-utils.js';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const subscription = await getUserSubscription(session.user.id);

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return {
    subscription: subscription
      ? {
          plan: { name: subscription.plan.name },
          interval: subscription.interval,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          paymentProvider: subscription.paymentProvider,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      provider: p.provider,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
  };
};
