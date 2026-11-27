import { test, expect } from '#src/fixtures/index.ts';
import { HealthApi } from '#src/api/clients/health-api.ts';

test('app reports a healthy status', { tag: '@smoke' }, async ({ anonymousApi }) => {
  // When anyone asks for the app's health
  const health = await anonymousApi(HealthApi).healthcheck();

  // Then the app answers that it is healthy
  expect(health.status).toBe(200);
  expect(health.data.status).toBe('healthy');
});

test('app reports its version in the bare format', async ({ anonymousApi }) => {
  // When anyone asks for the app's version
  const version = await anonymousApi(HealthApi).version();

  // Then it is a bare version number, with no prefix or suffix
  expect(version.data.version).toMatch(/^\d+\.\d+\.\d+$/);
});
