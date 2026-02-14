import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canViewAnalytics } from '$lib/server/permissions.js';
import {
  getAnalyticsSummary,
  getPageViews,
  getTopPages,
  getGeoBreakdown,
  getReferrers,
  getDeviceBreakdown,
  getRealtimeVisitors,
} from '$lib/server/analytics.js';

type Period = '24h' | '7d' | '30d' | '90d';

export const GET: RequestHandler = async ({ locals, url, params }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  if (!(await canViewAnalytics(session.user.id, projectId))) {
    return json(
      { error: 'Analytics requires Starter+ plan' },
      { status: 403 }
    );
  }

  const period = (url.searchParams.get('period') || '7d') as Period;
  const metric = url.searchParams.get('metric');

  if (!['24h', '7d', '30d', '90d'].includes(period)) {
    return json({ error: 'Invalid period' }, { status: 400 });
  }

  // If a specific metric is requested, return just that
  if (metric) {
    switch (metric) {
      case 'pageviews':
        return json(await getPageViews(projectId, period));
      case 'toppages':
        return json(await getTopPages(projectId, period));
      case 'geo':
        return json(await getGeoBreakdown(projectId, period));
      case 'referrers':
        return json(await getReferrers(projectId, period));
      case 'devices':
        return json(await getDeviceBreakdown(projectId, period));
      case 'realtime':
        return json({ visitors: await getRealtimeVisitors(projectId) });
      default:
        return json({ error: 'Invalid metric' }, { status: 400 });
    }
  }

  // Return full summary
  const [summary, pageViews, geo, referrers, devices] = await Promise.all([
    getAnalyticsSummary(projectId, period),
    getPageViews(projectId, period),
    getGeoBreakdown(projectId, period),
    getReferrers(projectId, period),
    getDeviceBreakdown(projectId, period),
  ]);

  return json({
    ...summary,
    pageViews,
    geo,
    referrers,
    devices,
  });
};
