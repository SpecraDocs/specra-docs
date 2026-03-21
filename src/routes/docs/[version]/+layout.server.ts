import { getCachedVersions, getCachedAllDocs, getEffectiveConfig, getI18nConfig, getVersionsMeta, loadVersionConfig } from 'specra';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
  const { version } = params;

  const i18nConfig = getI18nConfig();
  const defaultLocale = i18nConfig?.defaultLocale || 'en';

  const allDocs = await getCachedAllDocs(version, defaultLocale);
  const versions = getCachedVersions();
  const config = getEffectiveConfig(version);
  const versionsMeta = getVersionsMeta(versions);
  const currentVersionConfig = loadVersionConfig(version);

  return {
    allDocs,
    versions,
    versionsMeta,
    config,
    versionBanner: currentVersionConfig?.banner,
  };
};
