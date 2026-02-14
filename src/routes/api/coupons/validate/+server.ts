import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateCoupon } from '$lib/server/coupons.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, planSlug, amount, currency } = await request.json();

    if (!code || !planSlug || !amount || !currency) {
      return json(
        { error: 'code, planSlug, amount, and currency are required' },
        { status: 400 }
      );
    }

    const result = await validateCoupon(code, planSlug, amount, currency);

    if (!result.valid) {
      return json({ valid: false, error: result.error });
    }

    return json({
      valid: true,
      discount: result.discount,
      finalAmount: result.finalAmount,
      couponType: result.coupon.type,
      couponValue: result.coupon.value,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
};
