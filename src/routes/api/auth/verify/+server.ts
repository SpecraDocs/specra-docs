import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateApiRequest } from '$lib/server/api-auth.js';

export const GET: RequestHandler = async ({ request }) => {
  const user = await authenticateApiRequest(request.headers.get('authorization'));

  if (!user) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  return json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
};
