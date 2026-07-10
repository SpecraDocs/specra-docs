/**
 * Shared RSS handler for changelog pages.
 *
 * Both doc route trees — `/docs/[version]/...` and `/docs/[product]/[version]/...`
 * — mount the same handler, so the feed cannot drift between them.
 */
import { error } from '@sveltejs/kit';
import { getCachedDocBySlug, getConfig, extractChangelogEntries, renderRssFeed } from 'specra';

interface FeedParams {
  slug: string;
  version: string;
  product?: string;
}

export async function buildChangelogFeed({ slug, version, product }: FeedParams): Promise<Response> {
  const doc = await getCachedDocBySlug(slug, version, product);

  // Only pages that opt in with `rss: true` publish a feed. Everything else has
  // no feed to serve — not an empty one.
  if (!doc || doc.meta?.rss !== true) {
    throw error(404, 'Not found');
  }

  const entries = extractChangelogEntries(doc.contentNodes);
  const config = getConfig();

  const siteUrl = config.site?.url ?? '';
  const pageUrl = product
    ? `/docs/${product}/${version}/${slug}`
    : `/docs/${version}/${slug}`;

  const xml = renderRssFeed({
    entries,
    siteUrl,
    pageUrl,
    title: doc.meta?.title || doc.title,
    description: doc.meta?.description ?? ''
  });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600'
    }
  });
}
