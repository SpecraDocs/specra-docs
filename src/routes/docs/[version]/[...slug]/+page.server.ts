import {
  extractTableOfContents,
  getAdjacentDocs,
  isCategoryPage,
  getCachedAllDocs,
  getCachedDocBySlug,
  getI18nConfig,
  getConfig,
} from 'specra';
import { redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { prisma } from '$lib/server/db.js';
import type { PageServerLoad } from './$types';

interface DocSessionPayload {
  visitorId: string;
  email: string;
  exp: number;
}

function verifyDocSession(cookie: string | undefined): DocSessionPayload | null {
  if (!cookie) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    return jwt.verify(cookie, secret) as DocSessionPayload;
  } catch {
    return null;
  }
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { version, slug: slugArray } = params;
  const slug = slugArray;

  const i18nConfig = getI18nConfig();
  const slugParts = slug.split('/');
  let locale: string | undefined;
  if (i18nConfig && i18nConfig.locales.includes(slugParts[0])) {
    locale = slugParts[0];
  }

  // allDocs used internally for adjacency/category checks — NOT returned to client
  // (sidebar data comes from +layout.server.ts and is cached across navigations)
  const allDocs = await getCachedAllDocs(version, locale);

  // Bare locale landing (e.g. /docs/v1.0.0/fr) → redirect to that locale's
  // first doc. Also the LanguageSwitcher's "no translation" fallback target.
  if (locale && slugParts.length === 1 && allDocs.length > 0) {
    redirect(302, `/docs/${version}/${allDocs[0].slug}`);
  }

  const config = getConfig();
  const isCategory = isCategoryPage(slug, allDocs);
  const doc = await getCachedDocBySlug(slug, version);

  // Which locales have a real translation of this page (used by the header
  // LanguageSwitcher to fall back to the docs home when a translation is
  // missing). The logical slug is the path without any locale prefix.
  const logicalSlug = locale ? slugParts.slice(1).join('/') : slug;
  let availableLocales: string[] = [];
  if (i18nConfig) {
    for (const loc of i18nConfig.locales) {
      const usePrefix = i18nConfig.prefixDefault || loc !== i18nConfig.defaultLocale;
      const canonical = usePrefix ? `${loc}/${logicalSlug}` : logicalSlug;
      const docsForLoc = await getCachedAllDocs(version, loc);
      if (docsForLoc.some((d) => d.slug === canonical)) availableLocales.push(loc);
    }
  }

  // Build metadata
  let title = 'Page Not Found';
  let description = 'The requested documentation page could not be found.';
  let ogUrl = `/docs/${version}/${slug}`;

  if (doc) {
    title = doc.meta.title || doc.title;
    description = doc.meta.description || `Documentation for ${title}`;
  }

  // Handle category page without doc
  if (!doc && isCategory) {
    const categoryDoc = allDocs.find((d) => d.slug.startsWith(slug + '/'));
    const categoryTabGroup = categoryDoc?.meta?.tab_group || categoryDoc?.categoryTabGroup;
    const categoryTitle = slug
      .split('/')
      .pop()
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Category';

    return {
      version,
      slug,
      isCategory: true,
      isNotFound: false,
      isProtected: false,
      doc: null,
      categoryTitle,
      categoryDescription: 'Browse the documentation in this section.',
      categoryTabGroup,
      toc: [],
      previous: null,
      next: null,
      title,
      description,
      ogUrl,
      availableLocales,
    };
  }

  // Handle not found
  if (!doc) {
    return {
      version,
      slug,
      isCategory: false,
      isNotFound: true,
      isProtected: false,
      doc: null,
      categoryTitle: null,
      categoryDescription: null,
      categoryTabGroup: undefined,
      toc: [],
      previous: null,
      next: null,
      title,
      description,
      ogUrl,
      availableLocales,
    };
  }

  // Check social login protection
  if (doc.meta.protected) {
    const session = verifyDocSession(cookies.get('specra-doc-session'));

    if (!session) {
      // Not authenticated — return no content
      return {
        version,
        slug,
        isCategory: false,
        isNotFound: false,
        isProtected: true,
        doc: null,
        categoryTitle: null,
        categoryDescription: null,
        categoryTabGroup: undefined,
        toc: [],
        previous: null,
        next: null,
        title,
        description,
        ogUrl,
        availableLocales,
      };
    }

    // Authenticated — log page access
    const projectId = config.site?.projectId;
    if (projectId) {
      // Fire-and-forget: don't block page load for analytics
      prisma.docPageAccess.create({
        data: {
          docVisitorId: session.visitorId,
          projectId,
          path: slug,
          version,
        },
      }).catch(() => {
        // Silently ignore access logging failures
      });
    }

    // Strip protected flag from meta before sending to client
    delete doc.meta.protected;
  }

  // Strip protected from meta (safety net)
  delete doc.meta.protected;

  // Normal doc page - use raw markdown (meta.content) for ToC extraction, doc.content is HTML
  const toc = extractTableOfContents(doc.meta.content || doc.content);
  const { previous, next } = getAdjacentDocs(slug, allDocs);
  const showCategoryIndex = isCategory && !!doc;
  // Look up tab group from allDocs since getDocBySlug doesn't read _category_.json
  const matchingDoc = allDocs.find((d) => d.slug === slug);
  const currentPageTabGroup = doc.meta?.tab_group || matchingDoc?.categoryTabGroup;

  return {
    version,
    slug,
    isCategory: showCategoryIndex,
    isNotFound: false,
    isProtected: false,
    doc,
    categoryTitle: null,
    categoryDescription: null,
    categoryTabGroup: currentPageTabGroup,
    toc,
    previous: previous ? { title: previous.meta.title, slug: previous.slug } : null,
    next: next ? { title: next.meta.title, slug: next.slug } : null,
    title,
    description,
    ogUrl,
    availableLocales,
  };
};
