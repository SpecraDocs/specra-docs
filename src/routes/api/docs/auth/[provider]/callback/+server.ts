import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { prisma } from '$lib/server/db.js';
import { getConfig } from 'specra';
import type { RequestHandler } from './$types';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
}

interface GoogleUser {
  sub: string;
  name: string;
  picture: string;
  email: string;
}

async function exchangeGitHubCode(code: string, redirectUri: string) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.AUTH_GITHUB_ID,
      client_secret: process.env.AUTH_GITHUB_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token as string;
}

async function getGitHubProfile(accessToken: string) {
  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }),
    fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }),
  ]);

  const user: GitHubUser = await userRes.json();
  const emails: GitHubEmail[] = await emailsRes.json();

  // Use primary verified email, or fallback to profile email
  const primaryEmail = emails.find((e) => e.primary && e.verified)?.email
    || emails.find((e) => e.verified)?.email
    || user.email;

  return {
    email: primaryEmail || '',
    name: user.name || user.login,
    image: user.avatar_url,
    providerAccountId: String(user.id),
  };
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.DOCS_GOOGLE_CLIENT_ID || '',
      client_secret: process.env.DOCS_GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data: GoogleTokenResponse = await res.json();
  if (!data.access_token) throw new Error('Failed to exchange Google code');
  return data.access_token;
}

async function getGoogleProfile(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const user: GoogleUser = await res.json();
  return {
    email: user.email,
    name: user.name,
    image: user.picture,
    providerAccountId: user.sub,
  };
}

export const GET: RequestHandler = async ({ params, url, cookies }) => {
  const { provider } = params;
  const code = url.searchParams.get('code');
  const callbackPath = cookies.get('specra-doc-callback') || '/';

  if (!code) {
    redirect(302, callbackPath);
  }

  if (provider !== 'google' && provider !== 'github') {
    return new Response('Invalid provider', { status: 400 });
  }

  const redirectUri = `${url.origin}/api/docs/auth/${provider}/callback`;

  try {
    let profile: { email: string; name: string; image: string; providerAccountId: string };

    if (provider === 'github') {
      const accessToken = await exchangeGitHubCode(code, redirectUri);
      profile = await getGitHubProfile(accessToken);
    } else {
      const accessToken = await exchangeGoogleCode(code, redirectUri);
      profile = await getGoogleProfile(accessToken);
    }

    if (!profile.email) {
      redirect(302, callbackPath + '?error=no_email');
    }

    // Upsert DocVisitor
    const visitor = await prisma.docVisitor.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      update: {
        email: profile.email,
        name: profile.name,
        image: profile.image,
        lastLoginAt: new Date(),
      },
      create: {
        email: profile.email,
        name: profile.name,
        image: profile.image,
        provider,
        providerAccountId: profile.providerAccountId,
      },
    });

    // Log page access
    const config = getConfig();
    const projectId = config.site?.projectId;

    if (projectId) {
      // Extract version and path from callbackPath: /docs/{version}/{...slug}
      const pathMatch = callbackPath.match(/^\/docs\/([^/]+)\/(.+)$/);
      const version = pathMatch?.[1] || 'unknown';
      const pagePath = pathMatch?.[2] || callbackPath;

      await prisma.docPageAccess.create({
        data: {
          docVisitorId: visitor.id,
          projectId,
          path: pagePath,
          version,
        },
      });
    }

    // Create JWT session
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return new Response('AUTH_SECRET not configured', { status: 500 });
    }

    const token = jwt.sign(
      { visitorId: visitor.id, email: visitor.email },
      secret,
      { expiresIn: '24h' }
    );

    cookies.set('specra-doc-session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
    });

    // Clean up callback cookie
    cookies.delete('specra-doc-callback', { path: '/' });

    redirect(302, callbackPath);
  } catch (err) {
    console.error(`[Doc OAuth] ${provider} callback error:`, err);
    redirect(302, callbackPath + '?error=auth_failed');
  }
};
