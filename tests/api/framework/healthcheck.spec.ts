import { test, expect } from '#src/fixtures/index.ts';
import { HealthApi } from '#src/api/clients/health-api.ts';

test('app reports a healthy status', { tag: '@smoke' }, async ({ anonymousApi }) => {
  const health = await anonymousApi(HealthApi).healthcheck();

  expect(health.status).toBe(200);
  expect(health.data.status).toBe('healthy');
});

test('app reports its version in the bare format', async ({ anonymousApi }) => {
  const version = await anonymousApi(HealthApi).version();

  expect(version.data.version).toMatch(/^\d+\.\d+\.\d+$/);
});
