import { defineConfig, devices } from '@playwright/test';
import { config } from '#src/config/index.ts';
import type { MockOptions } from '#src/fixtures/mock.fixtures.ts';

const { profile } = config;

const LEDGER = /@ledger/;
// tests/ui runs as two projects, split by the @ledger tag; both use the same settings.
const ui = { testDir: 'tests/ui', use: { ...devices['Desktop Chrome'] } };

export default defineConfig<MockOptions>({
  fullyParallel: true,
  globalSetup: './tests/global-setup.ts',
  retries: profile.retries,
  workers: profile.workers,
  forbidOnly: profile.forbidOnly,
  failOnFlakyTests: profile.failOnFlakyTests,
  timeout: profile.timeout,
  expect: { timeout: profile.expectTimeout },
  reporter: profile.reporter,
  use: {
    baseURL: config.BASE_URL,
    extraHTTPHeaders: config.syntheticHeaders,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: 'tests/api' },
    { name: 'ui', ...ui, grepInvert: LEDGER },
    {
      name: 'ui-mocked',
      testDir: 'tests/ui-mocked',
      use: { ...devices['Desktop Chrome'], networkGuard: true },
    },
    // UI tests tagged @ledger move money through the page, which gives up on a request after 15 s
    // while the app queues every money operation behind one lock. They run alone: one at a time,
    // after the projects that use the real app; ui-mocked never reaches it
    // (.qa/bugs/ghissue-14/post-api-marketplace-buy--ui-gives-up-after-15s-but-charges.md).
    {
      name: 'ui-ledger',
      ...ui,
      grep: LEDGER,
      workers: 1,
      dependencies: ['api', 'ui'],
    },
  ],
});
