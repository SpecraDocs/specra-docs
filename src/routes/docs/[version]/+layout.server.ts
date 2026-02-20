import { getCachedVersions, getCachedAllDocs, getConfig, getI18nConfig } from 'specra';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
  const { version } = params;

  const i18nConfig = getI18nConfig();
  const defaultLocale = i18nConfig?.defaultLocale || 'en';

  const allDocs = await getCachedAllDocs(version, defaultLocale);
  const versions = getCachedVersions();
  const config = getConfig();

  return { allDocs, versions, config };
};
