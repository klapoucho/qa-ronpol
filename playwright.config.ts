import { defineConfig, devices } from '@playwright/test';
import { config } from '#src/config/index.ts';
import type { MockOptions } from '#src/fixtures/mock.fixtures.ts';

const { profile } = config;

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
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: 'tests/api' },
    { name: 'ui', testDir: 'tests/ui', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'ui-mocked',
      testDir: 'tests/ui-mocked',
      use: { ...devices['Desktop Chrome'], networkGuard: true },
    },
  ],
});
