import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { validateCoupon } from '$lib/server/coupons.js';
import { calculateOrderTotal } from '$lib/server/tax.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { country, planId, interval, couponCode } = await request.json();

    if (!country || !planId) {
      return json(
        { error: 'country and planId are required' },
        { status: 400 }
      );
    }

    // Look up by id first, then by slug
    let plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      plan = await prisma.plan.findUnique({ where: { slug: planId } });
    }
    if (!plan) {
      return json({ error: 'Plan not found' }, { status: 404 });
    }

    // Determine price based on interval and implied currency from country
    const isKes = country === 'KE';
    const currency = isKes ? 'KES' : 'USD';

    let planPrice: number;
    if (isKes) {
      planPrice = interval === 'annual' ? (plan.priceKesAnnual ?? plan.priceKes) : plan.priceKes;
    } else {
      planPrice = interval === 'annual' ? (plan.priceUsdAnnual ?? plan.priceUsd) : plan.priceUsd;
    }

    let discount = 0;
    let couponValid = false;
    let couponError: string | undefined;

    if (couponCode) {
      const result = await validateCoupon(couponCode, plan.slug, planPrice, currency);
      if (result.valid) {
        discount = result.discount;
        couponValid = true;
      } else {
        couponError = result.error;
      }
    }

    const totals = await calculateOrderTotal({
      planPrice,
      discount,
      country,
    });

    return json({
      ...totals,
      currency,
      couponValid,
      couponError,
    });
  } catch (error) {
    console.error('Tax calculation error:', error);
    return json({ error: 'Failed to calculate tax' }, { status: 500 });
  }
};
