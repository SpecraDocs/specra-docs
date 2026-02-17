import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { getOrgSeatInfo } from '$lib/server/permissions.js';
import { stripe, EXTRA_SEAT_PRICES } from '$lib/server/stripe.js';
import { logAudit } from '$lib/server/audit.js';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const seatInfo = await getOrgSeatInfo(orgId);
  if (!seatInfo) {
    return json({ error: 'Organization not found' }, { status: 404 });
  }

  const pricing = EXTRA_SEAT_PRICES[seatInfo.planSlug] ?? null;

  return json({
    ...seatInfo,
    pricing: pricing
      ? {
          pricePerSeatUsd: pricing.pricePerSeatUsd,
        }
      : null,
  });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orgId } = params;

  // Only owner/admin can purchase seats
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!membership || membership.role === 'MEMBER') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { quantity } = await request.json();

  if (typeof quantity !== 'number' || quantity < 0 || !Number.isInteger(quantity)) {
    return json({ error: 'Quantity must be a non-negative integer' }, { status: 400 });
  }

  const seatInfo = await getOrgSeatInfo(orgId);
  if (!seatInfo) {
    return json({ error: 'Organization not found' }, { status: 404 });
  }

  // Block non-Stripe subscriptions
  if (seatInfo.paymentProvider !== 'STRIPE' || !seatInfo.stripeSubscriptionId) {
    return json(
      {
        error:
          'Extra seats can only be purchased on Stripe-billed subscriptions. Please upgrade your plan first.',
      },
      { status: 400 }
    );
  }

  if (!seatInfo.canBuyExtraSeats) {
    return json(
      { error: 'Extra seats are not available for your plan' },
      { status: 400 }
    );
  }

  const pricing = EXTRA_SEAT_PRICES[seatInfo.planSlug];
  if (!pricing) {
    return json(
      { error: 'No seat pricing configured for this plan' },
      { status: 400 }
    );
  }

  // Can't reduce below current usage minus base seats
  const minExtraSeats = Math.max(0, seatInfo.currentUsage - seatInfo.baseSeats);
  if (quantity < minExtraSeats) {
    return json(
      {
        error: `Cannot reduce to ${quantity} extra seats. You have ${seatInfo.currentUsage} seats in use (${seatInfo.baseSeats} base). Remove members or revoke invitations first.`,
        minExtraSeats,
      },
      { status: 400 }
    );
  }

  const seatPriceId =
    seatInfo.interval === 'ANNUAL'
      ? pricing.stripePriceIdAnnual
      : pricing.stripePriceIdMonthly;

  try {
    let stripeExtraSeatItemId = seatInfo.stripeExtraSeatItemId;

    if (quantity > 0 && !stripeExtraSeatItemId) {
      // Create new subscription item
      const item = await stripe.subscriptionItems.create({
        subscription: seatInfo.stripeSubscriptionId,
        price: seatPriceId,
        quantity,
        proration_behavior: 'create_prorations',
      });
      stripeExtraSeatItemId = item.id;
    } else if (quantity > 0 && stripeExtraSeatItemId) {
      // Update existing subscription item
      await stripe.subscriptionItems.update(stripeExtraSeatItemId, {
        quantity,
        proration_behavior: 'create_prorations',
      });
    } else if (quantity === 0 && stripeExtraSeatItemId) {
      // Remove subscription item
      await stripe.subscriptionItems.del(stripeExtraSeatItemId, {
        proration_behavior: 'create_prorations',
      });
      stripeExtraSeatItemId = null;
    }

    // Update DB
    await prisma.subscription.update({
      where: { id: seatInfo.subscriptionId! },
      data: {
        extraSeats: quantity,
        stripeExtraSeatItemId,
      },
    });

    logAudit({
      userId: session.user.id,
      orgId,
      action: 'ORG.SEATS_CHANGED',
      target: orgId,
      metadata: {
        previousExtraSeats: seatInfo.extraSeats,
        newExtraSeats: quantity,
      },
    });

    // Return updated seat info
    const updated = await getOrgSeatInfo(orgId);
    return json(updated);
  } catch (err) {
    console.error('Stripe seat update failed:', err);
    return json(
      { error: 'Failed to update seats. Please try again.' },
      { status: 500 }
    );
  }
};
