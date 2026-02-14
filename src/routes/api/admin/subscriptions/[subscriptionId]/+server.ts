import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';
import { stripe } from '$lib/server/stripe.js';

export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = params;

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: true,
      },
    });

    if (!subscription) {
      return json({ error: 'Subscription not found' }, { status: 404 });
    }

    return json({ subscription });
  } catch (error) {
    console.error('Get subscription error:', error);
    return json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = params;
    const { planId, reason } = await request.json();

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      return json({ error: 'Subscription not found' }, { status: 404 });
    }

    const newPlan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!newPlan) {
      return json({ error: 'Plan not found' }, { status: 404 });
    }

    // For Stripe subscriptions, update via Stripe API
    if (subscription.paymentProvider === 'STRIPE' && subscription.stripeSubscriptionId) {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      const newPriceId =
        subscription.interval === 'ANNUAL'
          ? newPlan.stripePriceIdAnnual
          : newPlan.stripePriceIdMonthly;

      if (!newPriceId) {
        return json(
          { error: 'New plan does not have a Stripe price configured' },
          { status: 400 }
        );
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
    }

    // Update in DB for all providers
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { planId },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_CHANGE_PLAN',
        target: subscription.userId,
        metadata: {
          subscriptionId,
          oldPlanId: subscription.planId,
          oldPlanName: subscription.plan.name,
          newPlanId: planId,
          newPlanName: newPlan.name,
          reason: reason || null,
        },
      },
    });

    return json({ subscription: updated });
  } catch (error) {
    console.error('Update subscription error:', error);
    return json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = params;

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      return json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Cancel Stripe subscription if applicable
    if (subscription.paymentProvider === 'STRIPE' && subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (err) {
        console.error('Failed to cancel Stripe subscription:', err);
      }
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED' },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_CANCEL_SUBSCRIPTION',
        target: subscription.userId,
        metadata: {
          subscriptionId,
          planName: subscription.plan.name,
          provider: subscription.paymentProvider,
        },
      },
    });

    return json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
};
