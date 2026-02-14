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

    const { taxId } = params;
    const updates = await request.json();

    const config = await prisma.taxConfig.findUnique({ where: { id: taxId } });
    if (!config) {
      return json({ error: 'Tax config not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (updates.rate !== undefined) data.rate = parseFloat(updates.rate);
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.active !== undefined) data.active = updates.active;

    const updated = await prisma.taxConfig.update({
      where: { id: taxId },
      data,
    });

    return json({ config: updated });
  } catch (error) {
    console.error('Update tax config error:', error);
    return json({ error: 'Failed to update tax config' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taxId } = params;

    await prisma.taxConfig.delete({ where: { id: taxId } });

    return json({ success: true });
  } catch (error) {
    console.error('Delete tax config error:', error);
    return json({ error: 'Failed to delete tax config' }, { status: 500 });
  }
};
