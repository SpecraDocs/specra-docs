import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe.js';
import { prisma } from '$lib/server/db.js';

export const POST: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        stripeCustomerId: { not: null },
      },
    });

    if (!subscription?.stripeCustomerId) {
      return json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.PUBLIC_APP_URL}/dashboard/billing`,
    });

    return json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
};
