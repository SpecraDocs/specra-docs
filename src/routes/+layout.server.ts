import { getConfig, initConfig } from 'specra';
import specraConfig from '../../specra.config.json';
import type { LayoutServerLoad } from './$types';
import type { SpecraConfig } from 'specra';

initConfig(specraConfig as unknown as Partial<SpecraConfig>);

export const load: LayoutServerLoad = async ({ locals }) => {
  const config = getConfig();
  let session = null;
  try {
    session = await locals.auth();
  } catch {
    // Auth may not be configured yet (no database, etc.)
  }
  const geo = locals.geo ?? { country: null, detectedCurrency: 'usd' as const };
  return { config, session, geo };
};
