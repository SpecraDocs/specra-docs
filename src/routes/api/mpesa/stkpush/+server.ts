import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stkPush } from '$lib/server/mpesa.js';
import { prisma } from '$lib/server/db.js';
import { validateCoupon, applyCoupon } from '$lib/server/coupons.js';
import { calculateOrderTotal } from '$lib/server/tax.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, planId, interval, couponCode, billingAddress } = await request.json();

    if (!phoneNumber) {
      return json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

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

    let baseAmount =
      interval === 'annual' ? (plan.priceKesAnnual ?? plan.priceKes) : plan.priceKes;

    let discount = 0;
    let couponId: string | undefined;

    // Validate and apply coupon
    if (couponCode) {
      const result = await validateCoupon(couponCode, plan.slug, baseAmount, 'KES');
      if (result.valid) {
        discount = result.discount;
        couponId = result.coupon.id;
      }
    }

    // Calculate tax
    const country = billingAddress?.country || 'KE';
    const totals = await calculateOrderTotal({
      planPrice: baseAmount,
      discount,
      country,
    });

    const finalAmount = totals.total;

    const result = await stkPush(
      phoneNumber,
      finalAmount,
      `SPECRA-${plan.slug.toUpperCase()}`,
      `Specra ${plan.name} subscription`
    );

    if (result.ResponseCode !== '0') {
      return json(
        { error: result.ResponseDescription || 'STK Push failed' },
        { status: 400 }
      );
    }

    // Increment coupon usage
    if (couponId) {
      await applyCoupon(couponId);
    }

    // Create a pending payment record with coupon and tax info
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: finalAmount,
        currency: 'KES',
        provider: 'MPESA',
        providerTxId: result.CheckoutRequestID,
        status: 'PENDING',
        couponCode: couponCode?.toUpperCase() || null,
        taxAmount: totals.taxAmount || null,
      },
    });

    // Create an INCOMPLETE subscription so the callback can activate it
    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await prisma.subscription.create({
      data: {
        userId: session.user.id,
        planId: plan.id,
        status: 'INCOMPLETE',
        paymentProvider: 'MPESA',
        interval: interval === 'annual' ? 'ANNUAL' : 'MONTHLY',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return json({
      checkoutRequestId: result.CheckoutRequestID,
      message: result.CustomerMessage,
    });
  } catch (error) {
    console.error('M-Pesa STK Push error:', error);
    return json(
      { error: 'Failed to initiate M-Pesa payment' },
      { status: 500 }
    );
  }
};
