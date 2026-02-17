import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db.js';
import { canViewAnalytics } from '$lib/server/permissions.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;
  const allowed = await canViewAnalytics(session.user.id, projectId);
  if (!allowed) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const period = url.searchParams.get('period') || '30d';
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 86400000);

  // Get visitors with their page access counts for this project and period
  const accesses = await prisma.docPageAccess.findMany({
    where: {
      projectId,
      createdAt: { gte: since },
    },
    include: {
      visitor: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group by visitor
  const visitorMap = new Map<string, {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    provider: string;
    pages: Array<{ path: string; version: string; visitedAt: string }>;
    lastVisit: string;
  }>();

  for (const access of accesses) {
    const v = access.visitor;
    const existing = visitorMap.get(v.id);

    const pageEntry = {
      path: access.path,
      version: access.version,
      visitedAt: access.createdAt.toISOString(),
    };

    if (existing) {
      existing.pages.push(pageEntry);
      if (access.createdAt.toISOString() > existing.lastVisit) {
        existing.lastVisit = access.createdAt.toISOString();
      }
    } else {
      visitorMap.set(v.id, {
        id: v.id,
        name: v.name,
        email: v.email,
        image: v.image,
        provider: v.provider,
        pages: [pageEntry],
        lastVisit: access.createdAt.toISOString(),
      });
    }
  }

  const visitors = Array.from(visitorMap.values()).map((v) => ({
    ...v,
    pageCount: v.pages.length,
  }));

  // Sort by last visit descending
  visitors.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  return json({ visitors });
};
