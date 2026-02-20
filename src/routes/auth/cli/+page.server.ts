import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { randomBytes, createHash } from 'crypto';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
  const port = url.searchParams.get('port');
  const state = url.searchParams.get('state');

  if (!port || !state) {
    return {
      error: 'Missing port or state parameter.',
    };
  }

  const session = await locals.auth();

  if (!session?.user?.id) {
    // Not logged in - redirect to login, then come back here
    const callbackUrl = `/auth/cli?port=${encodeURIComponent(port)}&state=${encodeURIComponent(state)}`;
    redirect(302, `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // User is logged in - generate an API token for the desktop app
  const rawToken = `specra_${randomBytes(32).toString('hex')}`;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      name: 'Specra Desktop App',
      tokenHash,
    },
  });

  // Redirect to the desktop app's local auth server
  const callbackUrl = `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(rawToken)}&state=${encodeURIComponent(state)}`;
  redirect(302, callbackUrl);
};
