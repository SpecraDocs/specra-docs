import { buildChangelogFeed } from '$lib/server/changelog-feed.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) =>
  buildChangelogFeed({ slug: params.slug, version: params.version, product: params.product });
