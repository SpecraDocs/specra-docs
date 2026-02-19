import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle } from '@sveltejs/kit';
import { handle as authHandle } from '$lib/server/auth.js';
import { lookupIp } from '$lib/server/geo.js';
import { isCaddyAvailable, syncAllRoutes } from '$lib/server/caddy.js';

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
    if (pathname !== '/auth/blocked') {
      redirect(302, '/auth/blocked');
    }
    return resolve(event);
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

  // Redirect logged-in users away from auth pages (except CLI auth flow and blocked page)
  if (pathname.startsWith('/auth/') && isLoggedIn) {
    if (pathname === '/auth/cli' || pathname === '/auth/blocked') {
      return resolve(event);
    }
    redirect(302, '/dashboard');
  }

  return resolve(event);
};

let caddySynced = false;

const caddySyncHandle: Handle = async ({ event, resolve }) => {
  if (!caddySynced) {
    try {
      const available = await isCaddyAvailable();
      if (available) {
        await syncAllRoutes();
        caddySynced = true;
        console.log('Caddy routes synced from database');
      }
    } catch (err) {
      console.error('Caddy sync failed, will retry on next request:', err);
    }
  }
  return resolve(event);
};

export const handle = sequence(authHandle, geoHandle, protectionHandle, caddySyncHandle);
