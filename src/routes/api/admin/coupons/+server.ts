import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';
import { stripe } from '$lib/server/stripe.js';

export const GET: RequestHandler = async ({ request, locals, url }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const activeOnly = url.searchParams.get('active') === 'true';

    const where: Record<string, unknown> = {};
    if (activeOnly) where.active = true;

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    return json({
      coupons,
      pagination: { page, totalPages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    console.error('List coupons error:', error);
    return json({ error: 'Failed to list coupons' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, type, value, currency, maxUses, expiresAt, applicablePlans } = await request.json();

    if (!code || !type || value === undefined) {
      return json(
        { error: 'code, type, and value are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return json({ error: 'Coupon code already exists' }, { status: 409 });
    }

    // Create Stripe coupon + promotion code
    let stripeCouponId: string | undefined;
    let stripePromotionCodeId: string | undefined;

    try {
      const stripeCouponParams: Record<string, unknown> = {
        name: code.toUpperCase(),
      };

      if (type === 'PERCENTAGE') {
        stripeCouponParams.percent_off = value;
      } else {
        stripeCouponParams.amount_off = value;
        stripeCouponParams.currency = (currency || 'usd').toLowerCase();
      }

      if (maxUses) {
        stripeCouponParams.max_redemptions = maxUses;
      }

      if (expiresAt) {
        stripeCouponParams.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
      }

      const stripeCoupon = await stripe.coupons.create(
        stripeCouponParams as Parameters<typeof stripe.coupons.create>[0]
      );
      stripeCouponId = stripeCoupon.id;

      const promotionCode = await stripe.promotionCodes.create(
        { coupon: stripeCoupon.id, code: code.toUpperCase() } as unknown as Parameters<typeof stripe.promotionCodes.create>[0]
      );
      stripePromotionCodeId = promotionCode.id;
    } catch (stripeErr) {
      console.error('Stripe coupon creation failed (continuing without Stripe sync):', stripeErr);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        currency: currency || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicablePlans: applicablePlans || [],
        stripeCouponId,
        stripePromotionCodeId,
      },
    });

    return json({ coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    return json({ error: 'Failed to create coupon' }, { status: 500 });
  }
};
