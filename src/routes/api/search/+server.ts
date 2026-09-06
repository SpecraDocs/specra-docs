import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MeiliSearch } from 'meilisearch';
import type { SpecraConfig } from 'specra';
import specraConfig from '../../../../specra.config.json';

interface SearchResult {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  version?: string;
}

/**
 * Run a Meilisearch query and normalize the hits into the shape the shipped
 * specra SearchModal expects ({ slug, title, version, excerpt }), deduplicated
 * by version+slug.
 */
async function runSearch(query: string) {
  const config: SpecraConfig = specraConfig as any;
  const searchConfig = config.search;

  if (!searchConfig?.enabled || searchConfig.provider !== 'meilisearch') {
    return { error: 'Search is not enabled', status: 400 } as const;
  }

  const meilisearchConfig = searchConfig.meilisearch;
  if (!meilisearchConfig) {
    return { error: 'Meilisearch is not configured', status: 400 } as const;
  }

  const client = new MeiliSearch({
    host: meilisearchConfig.host,
    apiKey: meilisearchConfig.apiKey || '',
  });

  const index = client.index(meilisearchConfig.indexName);
  const searchResults = await index.search(query, {
    limit: 50, // Get more results before deduplication
    attributesToCrop: ['content'],
    cropLength: 30,
  });

  // Deduplicate by slug + version.
  const seenDocs = new Set<string>();
  const uniqueHits = searchResults.hits.filter((hit: any) => {
    const key = `${hit.version}-${hit.slug}`;
    if (seenDocs.has(key)) return false;
    seenDocs.add(key);
    return true;
  });

  const results: SearchResult[] = uniqueHits.slice(0, 20).map((hit: any) => {
    // Prefer the cropped snippet; strip any Meilisearch highlight tags since
    // the client renders its own highlighting.
    const cropped = hit._formatted?.content ?? hit.content ?? '';
    const excerpt = String(cropped).replace(/<\/?em>/g, '').trim();
    return {
      slug: hit.slug,
      title: hit.title,
      version: hit.version,
      excerpt,
    };
  });

  return {
    results,
    query,
    processingTimeMs: searchResults.processingTimeMs,
    status: 200,
  } as const;
}

// GET /api/search?q=... — used by the specra SearchModal component.
export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';

  if (!query) {
    return json({ results: [], query: '' });
  }

  try {
    const result = await runSearch(query);
    if ('error' in result) {
      return json({ error: result.error }, { status: result.status });
    }
    return json({
      results: result.results,
      // keep hits too for any callers relying on it
      hits: result.results,
      query: result.query,
      processingTimeMs: result.processingTimeMs,
      estimatedTotalHits: result.results.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

// POST /api/search { query } — kept for backward compatibility.
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return json({ error: 'Invalid query' }, { status: 400 });
    }

    const result = await runSearch(query);
    if ('error' in result) {
      return json({ error: result.error }, { status: result.status });
    }

    return json({
      results: result.results,
      hits: result.results,
      query: result.query,
      processingTimeMs: result.processingTimeMs,
      estimatedTotalHits: result.results.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
