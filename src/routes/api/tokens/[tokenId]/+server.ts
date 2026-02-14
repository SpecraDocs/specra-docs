import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tokenId } = params;

  const token = await prisma.apiToken.findUnique({
    where: { id: tokenId },
  });

  if (!token || token.userId !== session.user.id) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.apiToken.delete({ where: { id: tokenId } });

  return json({ success: true });
};
