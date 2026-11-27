import { existsSync } from 'node:fs';
import { parseEnv, type Env } from '#src/config/env.ts';
import { environments, type Environment } from '#src/config/environments.ts';
import { profiles, type Profile } from '#src/config/profiles.ts';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const env = parseEnv(process.env);
const environment: Environment = environments[env.APP_ENV];

if (env.RESET_DB && !environment.resettable) {
  throw new Error(
    `Invalid configuration:\n  RESET_DB: the ${env.APP_ENV} environment must not be reset; only dev allows RESET_DB=true`,
  );
}

export const config: Env & {
  BASE_URL: string;
  environment: Environment;
  profile: Profile;
  syntheticHeaders: Record<string, string>;
} = {
  ...env,
  BASE_URL: env.BASE_URL ?? environment.baseUrl,
  environment,
  profile: profiles[env.TEST_ENV],
  // Marks test traffic as a verified synthetic monitor, which the app exempts from its API rate limit.
  syntheticHeaders: { 'X-Synthetic-Token': env.SYNTHETIC_TOKEN },
};
