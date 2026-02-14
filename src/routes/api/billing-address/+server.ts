import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingAddress = await prisma.billingAddress.findUnique({
      where: { userId: session.user.id },
    });

    return json({ billingAddress });
  } catch (error) {
    console.error('Get billing address error:', error);
    return json({ error: 'Failed to get billing address' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, city, state, country, postalCode, taxPin } = await request.json();

    if (!address || !city || !country) {
      return json(
        { error: 'address, city, and country are required' },
        { status: 400 }
      );
    }

    const billingAddress = await prisma.billingAddress.upsert({
      where: { userId: session.user.id },
      update: { address, city, state, country, postalCode, taxPin },
      create: {
        userId: session.user.id,
        address,
        city,
        state,
        country,
        postalCode,
        taxPin,
      },
    });

    return json({ billingAddress });
  } catch (error) {
    console.error('Update billing address error:', error);
    return json({ error: 'Failed to update billing address' }, { status: 500 });
  }
};
