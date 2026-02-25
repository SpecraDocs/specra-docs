import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db.js';
import { resolveUserId } from '$lib/server/api-auth.js';

const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'mail', 'ftp', 'ssh', 'blog',
  'docs', 'help', 'support', 'status', 'cdn', 'static', 'assets',
  'login', 'signup', 'register', 'auth', 'oauth', 'dashboard',
  'settings', 'billing', 'account', 'specra', 'root', 'ns1', 'ns2',
]);

export const GET: RequestHandler = async ({ url, locals, request }) => {
  const userId = await resolveUserId(locals, request);
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = url.searchParams.get('slug')?.trim();
  if (!slug) {
    return json({ error: 'slug query parameter is required' }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return json({ available: false, reason: 'Invalid format' });
  }

  if (slug.length < 3) {
    return json({ available: false, reason: 'Must be at least 3 characters' });
  }

  if (RESERVED_SLUGS.has(slug)) {
    return json({ available: false, reason: 'This subdomain is reserved' });
  }

  const existing = await prisma.project.findFirst({
    where: { OR: [{ slug }, { subdomain: slug }] },
    select: { id: true },
  });

  return json({ available: !existing });
};
