import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MeiliSearch } from 'meilisearch';
import type { SpecraConfig } from 'specra';
import specraConfig from '../../../../specra.config.json';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const config: SpecraConfig = specraConfig as any;
    const searchConfig = config.search;

    // Check if search is enabled and Meilisearch is configured
    if (!searchConfig?.enabled || searchConfig.provider !== 'meilisearch') {
      return json(
        { error: 'Search is not enabled' },
        { status: 400 }
      );
    }

    const meilisearchConfig = searchConfig.meilisearch;
    if (!meilisearchConfig) {
      return json(
        { error: 'Meilisearch is not configured' },
        { status: 400 }
      );
    }

    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return json(
        { error: 'Invalid query' },
        { status: 400 }
      );
    }

    // Initialize Meilisearch client with API key
    const client = new MeiliSearch({
      host: meilisearchConfig.host,
      apiKey: meilisearchConfig.apiKey || '',
    });

    // Search the index
    const index = client.index(meilisearchConfig.indexName);
    const searchResults = await index.search(query, {
      limit: 50, // Get more results before deduplication
      attributesToHighlight: ['title', 'content'],
      attributesToCrop: ['content'],
      cropLength: 100,
    });

    // Deduplicate results by slug and version on the server side
    const seenDocs = new Set<string>();
    const uniqueHits = searchResults.hits.filter((hit: any) => {
      const key = `${hit.version}-${hit.slug}`;
      if (seenDocs.has(key)) {
        return false;
      }
      seenDocs.add(key);
      return true;
    }).slice(0, 20); // Return only top 20 unique results

    return json({
      hits: uniqueHits,
      query: query,
      processingTimeMs: searchResults.processingTimeMs,
      estimatedTotalHits: uniqueHits.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
