import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db.js';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

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

  return {
    session,
    tokens: tokens.map((t) => ({
      ...t,
      lastUsed: t.lastUsed?.toISOString() ?? null,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  };
};
