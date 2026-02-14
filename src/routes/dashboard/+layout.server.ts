import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAdmin } from '$lib/server/permissions.js';
import { getUserOrganizations } from '$lib/server/auth-utils.js';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const session = await locals.auth();
  if (!session?.user) {
    redirect(302, '/auth/login');
  }

  const [userIsAdmin, memberships] = await Promise.all([
    session.user.id ? isAdmin(session.user.id) : Promise.resolve(false),
    session.user.id ? getUserOrganizations(session.user.id) : Promise.resolve([]),
  ]);

  const organizations = memberships.map((m: any) => ({
    id: m.organization.id,
    name: m.organization.name,
  }));

  const scopeCookie = cookies.get('dashboard-scope') ?? 'personal';
  const currentScope =
    scopeCookie === 'personal' || organizations.some((o: any) => o.id === scopeCookie)
      ? scopeCookie
      : 'personal';

  return {
    session,
    userIsAdmin,
    organizations,
    currentScope,
  };
};
