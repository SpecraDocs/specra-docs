import {
  extractTableOfContents,
  getAdjacentDocs,
  isCategoryPage,
  getCachedAllDocs,
  getCachedDocBySlug,
  getI18nConfig,
  getConfig,
  getProducts,
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
  const { product, version, slug: slugArray } = params;
  const slug = slugArray;

  // Verify product exists
  const products = getProducts();
  const matchedProduct = products.find(p => p.slug === product);
  if (!matchedProduct) {
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
      title: 'Page Not Found',
      description: 'The requested documentation page could not be found.',
      ogUrl: `/docs/${product}/${version}/${slug}`,
    };
  }

  const i18nConfig = getI18nConfig();
  const slugParts = slug.split('/');
  let locale: string | undefined;
  if (i18nConfig && i18nConfig.locales.includes(slugParts[0])) {
    locale = slugParts[0];
  }

  const allDocs = await getCachedAllDocs(version, locale, product);
  const config = getConfig();
  const isCategory = isCategoryPage(slug, allDocs);
  const doc = await getCachedDocBySlug(slug, version, product);
  const urlPrefix = `/docs/${product}/${version}`;

  let title = 'Page Not Found';
  let description = 'The requested documentation page could not be found.';
  let ogUrl = `${urlPrefix}/${slug}`;

  if (doc) {
    title = doc.meta.title || doc.title;
    description = doc.meta.description || `Documentation for ${title}`;
  }

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
      product,
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

  if (!doc) {
    return {
      version,
      slug,
      product,
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
      return {
        version,
        slug,
        product,
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

    const projectId = config.site?.projectId;
    if (projectId) {
      prisma.docPageAccess.create({
        data: {
          docVisitorId: session.visitorId,
          projectId,
          path: slug,
          version,
        },
      }).catch(() => {});
    }

    delete doc.meta.protected;
  }

  delete doc.meta.protected;

  const toc = extractTableOfContents(doc.meta.content || doc.content);
  const { previous, next } = getAdjacentDocs(slug, allDocs);
  const showCategoryIndex = isCategory && !!doc;
  const matchingDoc = allDocs.find((d) => d.slug === slug);
  const currentPageTabGroup = doc.meta?.tab_group || matchingDoc?.categoryTabGroup;

  return {
    version,
    slug,
    product,
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
