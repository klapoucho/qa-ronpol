import { test as base } from '@playwright/test';
import { AuthApi } from '#src/api/clients/auth-api.ts';
import type { ApiClientClass, BaseApi } from '#src/api/http/base-api.ts';
import type { User, UserInput } from '#src/api/models/user.ts';
import { buildUser } from '#src/data/factories/user.factory.ts';

export type ApiAs = <T extends BaseApi>(Client: ApiClientClass<T>, user?: { token: string }) => T;

export type TestUser = { input: UserInput; id: User['id']; token: string; loginTime: string };
export type CreateUser = (overrides?: Partial<UserInput>) => Promise<TestUser>;

export const test = base.extend<{ apiAs: ApiAs; createUser: CreateUser }>({
  apiAs: async ({ request }, use) => {
    await use((Client, user) => new Client(request, user?.token));
  },
  createUser: async ({ playwright, baseURL }, use) => {
    await use(async (overrides) => {
      const input = buildUser(overrides);
      // A fresh context per user: register sets a rolnopolToken cookie on the context it runs in.
      const context = await playwright.request.newContext({ baseURL });
      try {
        const registered = await new AuthApi(context).register(input);
        if (!registered.ok) {
          throw new Error(
            `Seeding failed: register ${input.email} -> ${registered.status}: ${registered.error}`,
          );
        }
        const { user, token, loginTime } = registered.data;
        return { input, id: user.id, token, loginTime };
      } finally {
        await context.dispose();
      }
    });
  },
});
