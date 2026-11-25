import { existsSync } from 'node:fs';
import { parseEnv, type Env } from '#src/config/env.ts';
import { profiles, type Profile } from '#src/config/profiles.ts';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const env = parseEnv(process.env);

export const config: Env & { profile: Profile; syntheticHeaders: Record<string, string> } = {
  ...env,
  profile: profiles[env.TEST_ENV],
  // Marks test traffic as a verified synthetic monitor, which the app exempts from its API rate limit.
  syntheticHeaders: { 'X-Synthetic-Token': env.SYNTHETIC_TOKEN },
};
