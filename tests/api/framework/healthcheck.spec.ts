import { test, expect } from '#src/fixtures/index.ts';
import { HealthApi } from '#src/api/clients/health-api.ts';

test('app reports a healthy status', { tag: '@smoke' }, async ({ apiAs }) => {
  const health = await apiAs(HealthApi).healthcheck();

  expect(health.status).toBe(200);
  expect(health.data.status).toBe('healthy');
});

test('app reports its version in the bare format', async ({ apiAs }) => {
  const version = await apiAs(HealthApi).version();

  expect(version.data.version).toMatch(/^\d+\.\d+\.\d+$/);
});
