import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ request, locals, url }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const status = url.searchParams.get('status') || undefined;
    const provider = url.searchParams.get('provider') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (provider) where.paymentProvider = provider;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return json({
      subscriptions,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('List subscriptions error:', error);
    return json(
      { error: 'Failed to list subscriptions' },
      { status: 500 }
    );
  }
};
