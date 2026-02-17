import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    redirect(303, '/auth/login?callbackUrl=/dashboard/analytics/visitors');
  }

  return { session };
};
