import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAdmin } from '$lib/server/permissions.js';

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    redirect(302, '/auth/login');
  }
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    redirect(302, '/dashboard');
  }
  return { session };
};
