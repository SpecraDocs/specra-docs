import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserOrganizations } from '$lib/server/auth-utils.js';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) redirect(302, '/auth/login');

  const memberships = await getUserOrganizations(session.user.id);

  return {
    memberships: memberships.map((m: any) => ({
      role: m.role,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        _count: m.organization._count,
      },
    })),
  };
};
