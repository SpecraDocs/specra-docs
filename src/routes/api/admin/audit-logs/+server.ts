import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { prisma } from '$lib/server/db.js';

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
  const search = url.searchParams.get('search') || '';
  const action = url.searchParams.get('action') || '';
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { target: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (action) {
    where.action = { startsWith: action };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};
