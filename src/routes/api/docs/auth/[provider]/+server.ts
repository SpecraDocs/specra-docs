import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const GET: RequestHandler = async ({ params, url, cookies }) => {
  const { provider } = params;
  const callbackPath = url.searchParams.get('callbackPath') || '/';

  if (provider !== 'google' && provider !== 'github') {
    return new Response('Invalid provider', { status: 400 });
  }

  // Store the callback path so we can redirect back after OAuth
  cookies.set('specra-doc-callback', callbackPath, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  const redirectUri = `${url.origin}/api/docs/auth/${provider}/callback`;

  if (provider === 'github') {
    const clientId = process.env.AUTH_GITHUB_ID;
    if (!clientId) {
      return new Response('GitHub OAuth not configured', { status: 500 });
    }

    const authUrl = new URL(GITHUB_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'read:user user:email');
    authUrl.searchParams.set('state', crypto.randomUUID());

    redirect(302, authUrl.toString());
  }

  // Google
  const clientId = process.env.DOCS_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response('Google OAuth not configured', { status: 500 });
  }

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', crypto.randomUUID());
  authUrl.searchParams.set('access_type', 'online');

  redirect(302, authUrl.toString());
};
