import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/server/auth.js';
import { lookupIp } from '$lib/server/geo.js';

const GEO_DEFAULT_COUNTRY = process.env.GEO_DEFAULT_COUNTRY || '';

const geoHandle: Handle = async ({ event, resolve }) => {
  try {
    // Try proxy headers first, then fall back to getClientAddress()
    const forwarded = event.request.headers.get('x-forwarded-for');
    const cfIp = event.request.headers.get('cf-connecting-ip');
    const ip = cfIp || (forwarded ? forwarded.split(',')[0].trim() : event.getClientAddress());

    const geo = lookupIp(ip);
    const country = geo.country || GEO_DEFAULT_COUNTRY || null;
    event.locals.geo = {
      country,
      detectedCurrency: country === 'KE' ? 'kes' : 'usd',
    };
  } catch {
    const fallback = GEO_DEFAULT_COUNTRY || null;
    event.locals.geo = { country: fallback, detectedCurrency: fallback === 'KE' ? 'kes' : 'usd' };
  }
  return resolve(event);
};

const protectionHandle: Handle = async ({ event, resolve }) => {
  const session = await event.locals.auth();
  const { pathname } = event.url;
  const isLoggedIn = !!session?.user;

  // Check if user is blocked
  if (isLoggedIn && (session.user as any)?.status === 'BLOCKED') {
    const loginUrl = new URL('/auth/login', event.url.origin);
    loginUrl.searchParams.set('error', 'AccountBlocked');
    loginUrl.searchParams.set('message', 'Your account has been blocked. Please contact support.');
    redirect(302, loginUrl.toString());
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/auth/login', event.url.origin);
      loginUrl.searchParams.set('callbackUrl', pathname);
      redirect(302, loginUrl.toString());
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/auth/login', event.url.origin);
      loginUrl.searchParams.set('callbackUrl', pathname);
      redirect(302, loginUrl.toString());
    }
  }

  // Redirect logged-in users away from auth pages (except CLI auth flow)
  if (pathname.startsWith('/auth/') && isLoggedIn) {
    if (pathname === '/auth/cli') {
      return resolve(event);
    }
    redirect(302, '/dashboard');
  }

  return resolve(event);
};

export const handle = sequence(authHandle, geoHandle, protectionHandle);
