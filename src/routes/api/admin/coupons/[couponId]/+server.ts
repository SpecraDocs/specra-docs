import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { couponId } = params;
    const updates = await request.json();

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      return json({ error: 'Coupon not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (updates.active !== undefined) data.active = updates.active;
    if (updates.maxUses !== undefined) data.maxUses = updates.maxUses;
    if (updates.expiresAt !== undefined) data.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
    if (updates.applicablePlans !== undefined) data.applicablePlans = updates.applicablePlans;

    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data,
    });

    return json({ coupon: updated });
  } catch (error) {
    console.error('Update coupon error:', error);
    return json({ error: 'Failed to update coupon' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { couponId } = params;

    await prisma.coupon.update({
      where: { id: couponId },
      data: { active: false },
    });

    return json({ success: true });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
};
