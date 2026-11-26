import { test as base } from '@playwright/test';
import { AuthApi } from '#src/api/clients/auth-api.ts';
import type { ApiClientClass, BaseApi } from '#src/api/http/base-api.ts';
import { buildUser } from '#src/data/factories/user.factory.ts';
import { TestUser } from '#src/fixtures/test-user.ts';

/** An API client for calls without a user, such as the healthcheck or an anonymous request. */
export type AnonymousApi = <T extends BaseApi>(Client: ApiClientClass<T>) => T;

/** Registers a new user; `funds` gives them that much ROL (new users have none). */
export type CreateUser = (options?: { funds?: number }) => Promise<TestUser>;

type ApiFixtures = {
  anonymousApi: AnonymousApi;
  createUser: CreateUser;
};

export const test = base.extend<ApiFixtures>({
  anonymousApi: async ({ request }, use) => {
    await use((Client) => new Client(request));
  },
  createUser: async ({ playwright, request, baseURL, extraHTTPHeaders }, use) => {
    await use(async ({ funds } = {}) => {
      const input = buildUser();
      // A fresh context per user: register sets a rolnopolToken cookie on the context it runs in.
      const context = await playwright.request.newContext({ baseURL, extraHTTPHeaders });
      try {
        // `.data` throws when the app refuses the registration.
        const registered = (await new AuthApi(context).register(input)).data;
        const user = new TestUser(request, input, registered);
        if (funds !== undefined) {
          await user.addFunds(funds);
        }
        return user;
      } finally {
        await context.dispose();
      }
    });
  },
});
