import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { randomBytes, createHash } from 'crypto';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return json(tokens);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, expiresInDays } = await request.json();

  if (!name) {
    return json({ error: 'Name is required' }, { status: 400 });
  }

  // Generate token
  const rawToken = `specra_${randomBytes(32).toString('hex')}`;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000)
    : null;

  await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      name,
      tokenHash,
      expiresAt,
    },
  });

  // Return the raw token only once - it cannot be retrieved again
  return json({ token: rawToken, name, expiresAt }, { status: 201 });
};
