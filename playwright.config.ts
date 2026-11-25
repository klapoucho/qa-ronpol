import { defineConfig } from '@playwright/test';
import { config } from '#src/config/index.ts';

const { profile } = config;

export default defineConfig({
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
  projects: [{ name: 'api', testDir: 'tests/api' }],
});
