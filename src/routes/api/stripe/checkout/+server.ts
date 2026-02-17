import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe.js';
import { prisma } from '$lib/server/db.js';
import { validateCoupon, applyCoupon } from '$lib/server/coupons.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, interval, couponCode, billingAddress, taxRate, taxAmount } = await request.json();

    // Check for existing active subscription
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });
    if (activeSub) {
      return json(
        { error: 'You already have an active subscription. Please cancel it first or manage it from your dashboard.' },
        { status: 409 }
      );
    }

    let plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      plan = await prisma.plan.findUnique({ where: { slug: planId } });
    }
    if (!plan) {
      return json({ error: 'Plan not found' }, { status: 404 });
    }

    // Save/update billing address if provided
    if (billingAddress && billingAddress.address && billingAddress.city && billingAddress.country) {
      await prisma.billingAddress.upsert({
        where: { userId: session.user.id },
        update: {
          address: billingAddress.address,
          city: billingAddress.city,
          state: billingAddress.state || null,
          country: billingAddress.country,
          postalCode: billingAddress.postalCode || null,
          taxPin: billingAddress.taxPin || null,
        },
        create: {
          userId: session.user.id,
          address: billingAddress.address,
          city: billingAddress.city,
          state: billingAddress.state || null,
          country: billingAddress.country,
          postalCode: billingAddress.postalCode || null,
          taxPin: billingAddress.taxPin || null,
        },
      });
    }

    // Validate coupon and check for 100% discount
    let couponResult: Awaited<ReturnType<typeof validateCoupon>> | null = null;
    if (couponCode) {
      const planPrice = interval === 'annual'
        ? (plan.priceUsdAnnual ?? plan.priceUsd)
        : plan.priceUsd;

      couponResult = await validateCoupon(couponCode, plan.slug, planPrice, 'USD');
    }

    // If coupon covers 100% of the cost, activate subscription directly without Stripe
    if (couponResult?.valid && couponResult.finalAmount === 0) {
      const now = new Date();
      const periodEnd = new Date(now);
      if (interval === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          status: 'ACTIVE',
          paymentProvider: 'ADMIN',
          interval: interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          grantReason: `100% coupon: ${couponCode.toUpperCase()}`,
        },
      });

      await applyCoupon(couponResult.coupon.id);

      await prisma.payment.create({
        data: {
          userId: session.user.id,
          subscriptionId: subscription.id,
          amount: 0,
          currency: 'USD',
          status: 'COMPLETED',
          provider: 'ADMIN',
          couponCode: couponCode.toUpperCase(),
        },
      });

      return json({
        url: `${process.env.PUBLIC_APP_URL}/dashboard?checkout=success`,
      });
    }

    // For paid checkouts, Stripe price must be configured
    const priceId =
      interval === 'annual'
        ? plan.stripePriceIdAnnual
        : plan.stripePriceIdMonthly;

    if (!priceId) {
      return json(
        { error: 'Stripe price not configured for this plan' },
        { status: 400 }
      );
    }

    // Check if user already has a Stripe customer ID
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, stripeCustomerId: { not: null } },
    });

    const checkoutParams: Record<string, unknown> = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
        interval,
        couponCode: couponCode || '',
        taxRate: String(taxRate || 0),
        taxAmount: String(taxAmount || 0),
        country: billingAddress?.country || '',
      },
    };

    // Apply partial coupon discount via Stripe promotion code
    if (couponResult?.valid && couponResult.coupon.stripePromotionCodeId) {
      checkoutParams.discounts = [
        { promotion_code: couponResult.coupon.stripePromotionCodeId },
      ];
    }

    if (existingSub?.stripeCustomerId) {
      checkoutParams.customer = existingSub.stripeCustomerId;
    } else {
      checkoutParams.customer_email = session.user.email;
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      checkoutParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    return json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
};
