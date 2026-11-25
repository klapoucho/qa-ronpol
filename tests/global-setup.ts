import { request } from '@playwright/test';
import { HealthApi } from '#src/api/clients/health-api.ts';
import { DebugApi } from '#src/api/clients/debug-api.ts';
import { config } from '#src/config/index.ts';

export default async function globalSetup(): Promise<void> {
  const context = await request.newContext({
    baseURL: config.BASE_URL,
    extraHTTPHeaders: config.syntheticHeaders,
  });
  try {
    const notReachable = (cause?: unknown) =>
      new Error(`Rolnopol is not reachable at ${config.BASE_URL}. Start it with: npm run app:up`, { cause });

    // Only a network failure or a non-200 answer counts as "not reachable". A reachable app whose
    // healthcheck no longer matches the schema is a different problem and surfaces below as such.
    const probe = await context.get('/api/v1/healthcheck').catch((error: unknown) => {
      throw notReachable(error);
    });
    if (probe.status() !== 200) {
      throw notReachable();
    }

    // Without a verified token, parallel runs hit the app's limit of 100 API requests per 30 s and
    // fail with 429s that look like flaky tests. Stop here with the cause instead.
    if (probe.headers()['x-synthetic-verified'] !== 'true') {
      throw new Error(
        `Rolnopol at ${config.BASE_URL} does not accept SYNTHETIC_TOKEN, so the tests would hit its API rate limit. ` +
          'The app must run with the same SYNTHETIC_TOKEN as the tests (compose.yaml and .env). ' +
          'Recreating it with npm run app:up resets its data, so only the author does that.',
      );
    }

    const health = await new HealthApi(context).healthcheck();
    void health.data; // throws if the body is not the expected envelope

    const about = await new HealthApi(context).about();
    if (about.data.version !== config.EXPECTED_APP_VERSION) {
      console.warn(
        `Warning: Rolnopol ${about.data.version} differs from EXPECTED_APP_VERSION ${config.EXPECTED_APP_VERSION}; continuing.`,
      );
    }

    if (config.RESET_DB) {
      const restore = await new DebugApi(context).restoreBaseDatabase();
      if (!restore.ok) {
        throw new Error(
          `RESET_DB=true: restoring the base database failed (${restore.status}: ${restore.error})`,
        );
      }
      console.log('RESET_DB=true: restored the base database.');
    }
  } finally {
    await context.dispose();
  }
}
