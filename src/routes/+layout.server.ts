import { getConfig, initConfig } from 'specra/lib';
import specraConfig from '../../specra.config.json';
import type { LayoutServerLoad } from './$types';
import type { SpecraConfig } from 'specra';

initConfig(specraConfig as unknown as Partial<SpecraConfig>);

export const load: LayoutServerLoad = async ({ locals }) => {
  const config = getConfig();
  const session = await locals.auth();
  return { config, session };
};
