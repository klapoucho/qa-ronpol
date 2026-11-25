import { test as base } from '@playwright/test';
import type { ApiClientClass, BaseApi } from '#src/api/http/base-api.ts';

export type ApiAs = <T extends BaseApi>(Client: ApiClientClass<T>, user?: { token: string }) => T;

export const test = base.extend<{ apiAs: ApiAs }>({
  apiAs: async ({ request }, use) => {
    await use((Client, user) => new Client(request, user?.token));
  },
});
