import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/server/auth.js';
import { lookupIp } from '$lib/server/geo.js';

const geoHandle: Handle = async ({ event, resolve }) => {
  try {
    const ip = event.getClientAddress();
    const geo = lookupIp(ip);
    event.locals.geo = {
      country: geo.country,
      detectedCurrency: geo.country === 'KE' ? 'kes' : 'usd',
    };
  } catch {
    event.locals.geo = { country: null, detectedCurrency: 'usd' };
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
