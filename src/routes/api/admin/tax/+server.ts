import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 50;

    const [configs, total] = await Promise.all([
      prisma.taxConfig.findMany({
        orderBy: { country: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.taxConfig.count(),
    ]);

    return json({
      configs,
      pagination: { page, totalPages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    console.error('List tax configs error:', error);
    return json({ error: 'Failed to list tax configs' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { country, rate, name } = await request.json();

    if (!country || rate === undefined || !name) {
      return json(
        { error: 'country, rate, and name are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.taxConfig.findUnique({
      where: { country: country.toUpperCase() },
    });
    if (existing) {
      return json(
        { error: 'Tax config for this country already exists' },
        { status: 409 }
      );
    }

    const config = await prisma.taxConfig.create({
      data: {
        country: country.toUpperCase(),
        rate: parseFloat(rate),
        name,
      },
    });

    return json({ config });
  } catch (error) {
    console.error('Create tax config error:', error);
    return json({ error: 'Failed to create tax config' }, { status: 500 });
  }
};
