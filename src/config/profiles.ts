import type { ReporterDescription } from '@playwright/test';
import type { Env } from '#src/config/env.ts';

export type Profile = {
  retries: number;
  workers: number | undefined;
  forbidOnly: boolean;
  failOnFlakyTests: boolean;
  timeout: number;
  expectTimeout: number;
  reporter: ReporterDescription[];
};

export const profiles: Record<Env['TEST_ENV'], Profile> = {
  local: {
    retries: 0,
    workers: undefined,
    forbidOnly: false,
    failOnFlakyTests: false,
    timeout: 30_000,
    expectTimeout: 5_000,
    reporter: [['list'], ['html', { open: 'never' }]],
  },
  ci: {
    retries: 1,
    workers: 4,
    forbidOnly: true,
    // A test that passes only on retry fails the run (NFR-15).
    failOnFlakyTests: true,
    timeout: 30_000,
    expectTimeout: 5_000,
    reporter: [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'reports/junit.xml' }]],
  },
};
