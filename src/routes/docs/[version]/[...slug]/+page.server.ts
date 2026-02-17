import {
  extractTableOfContents,
  getAdjacentDocs,
  isCategoryPage,
  getCachedVersions,
  getCachedAllDocs,
  getCachedDocBySlug,
  getI18nConfig,
  getConfig,
} from 'specra';
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

  const allDocs = await getCachedAllDocs(version, locale);
  const versions = getCachedVersions();
  const config = getConfig();
  const isCategory = isCategoryPage(slug, allDocs);
  const doc = await getCachedDocBySlug(slug, version);

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
      allDocs,
      versions,
      config,
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
    };
  }

  // Handle not found
  if (!doc) {
    return {
      version,
      slug,
      allDocs,
      versions,
      config,
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
        allDocs,
        versions,
        config,
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
    allDocs,
    versions,
    config,
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
  };
};
