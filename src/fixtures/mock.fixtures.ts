import { test as base, type BrowserContext } from '@playwright/test';
import { installSharedHandlers } from '#src/mocks/handlers/shared.ts';
import { MockApi } from '#src/mocks/mock-api.ts';
import { buildProfile } from '#src/mocks/payloads/profile.ts';
import { sessionCookies, type Session } from '#src/ui/session.ts';

export type MockOptions = { networkGuard: boolean };

const mockApis = new WeakMap<BrowserContext, MockApi>();

export const test = base.extend<MockOptions & { mockSession: Session; mockApi: MockApi }>({
  networkGuard: [false, { option: true }],

  mockSession: async ({}, use) => {
    const user = buildProfile();
    await use({
      token: 'mock-token',
      userId: user.id,
      userLabel: user.displayedName,
      loginTime: new Date().toISOString(),
    });
  },

  // With the guard on, every /api/ request goes to a MockApi, the page-load calls are answered and
  // the browser carries the mock session's cookies before the test body runs. After the test,
  // any request no handler served fails it, including requests fired after the test body.
  context: async ({ context, networkGuard, mockSession, baseURL }, use) => {
    if (!networkGuard) {
      await use(context);
      return;
    }
    const api = await MockApi.attach(context);
    installSharedHandlers(api, mockSession);
    await context.addCookies(sessionCookies(mockSession, baseURL ?? ''));
    mockApis.set(context, api);

    await use(context);

    const { unhandled } = api;
    if (unhandled.length > 0) {
      throw new Error(
        `Network guard: ${unhandled.length} API request(s) were not served by a mock handler:\n` +
          unhandled.map((request) => `  ${request}`).join('\n'),
      );
    }
  },

  mockApi: async ({ context }, use) => {
    const api = mockApis.get(context);
    if (!api) {
      throw new Error('mockApi needs networkGuard: true (the ui-mocked project)');
    }
    await use(api);
  },
});
