import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enforceExpiredSubscriptions } from '$lib/server/enforce.js';

export const GET: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await enforceExpiredSubscriptions();

    return json({
      success: true,
      enforced: results.enforced,
      restored: results.restored,
      errors: results.errors,
    });
  } catch (error) {
    console.error('Cron enforce-subscriptions error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
