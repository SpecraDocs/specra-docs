import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { checkPlanLimits } from '$lib/server/permissions.js';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const limits = await checkPlanLimits(session.user.id);

  return {
    planSlug: limits.planSlug,
  };
};
