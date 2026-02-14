import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

function getDocsHash(): string {
  const docsDir = join(process.cwd(), 'docs');
  try {
    let latestMtime = 0;

    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx') || entry.name.endsWith('.svx')) {
          const stat = statSync(fullPath);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
          }
        }
      }
    }

    walk(docsDir);
    return String(latestMtime);
  } catch {
    return String(Date.now());
  }
}

export const GET: RequestHandler = async () => {
  if (!dev) {
    return json({ hash: 'production' });
  }

  const hash = getDocsHash();
  return json({ hash, timestamp: Date.now() });
};
