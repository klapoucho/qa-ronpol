import { test as base } from '@playwright/test';
import { AuthApi } from '#src/api/clients/auth-api.ts';
import { FieldsApi } from '#src/api/clients/fields-api.ts';
import { FinancialApi } from '#src/api/clients/financial-api.ts';
import type { ApiResponse } from '#src/api/http/api-response.ts';
import type { ApiClientClass, BaseApi } from '#src/api/http/base-api.ts';
import type { Field, FieldInput } from '#src/api/models/field.ts';
import type { FinancialTransaction } from '#src/api/models/financial.ts';
import type { User, UserInput } from '#src/api/models/user.ts';
import { buildField } from '#src/data/factories/field.factory.ts';
import { buildIncome } from '#src/data/factories/income.factory.ts';
import { buildUser } from '#src/data/factories/user.factory.ts';

export type ApiAs = <T extends BaseApi>(Client: ApiClientClass<T>, user?: { token: string }) => T;

export type TestUser = { input: UserInput; id: User['id']; token: string; loginTime: string };
export type CreateUser = (overrides?: Partial<UserInput>) => Promise<TestUser>;
export type CreateField = (owner: TestUser, overrides?: Partial<FieldInput>) => Promise<Field>;
export type FundUser = (user: TestUser, amount: number) => Promise<FinancialTransaction>;

type ApiFixtures = {
  apiAs: ApiAs;
  createUser: CreateUser;
  createField: CreateField;
  fundUser: FundUser;
};

// A seed step that fails must fail the test loudly, never look like an expected failure.
export function seeded<T>(response: ApiResponse<T>, step: string): T {
  if (!response.ok) {
    throw new Error(`Seeding failed: ${step} -> ${response.status}: ${response.error}`);
  }
  return response.data;
}

export const test = base.extend<ApiFixtures>({
  apiAs: async ({ request }, use) => {
    await use((Client, user) => new Client(request, user?.token));
  },
  createUser: async ({ playwright, baseURL, extraHTTPHeaders }, use) => {
    await use(async (overrides) => {
      const input = buildUser(overrides);
      // A fresh context per user: register sets a rolnopolToken cookie on the context it runs in.
      const context = await playwright.request.newContext({ baseURL, extraHTTPHeaders });
      try {
        const registered = await new AuthApi(context).register(input);
        const { user, token, loginTime } = seeded(registered, `register ${input.email}`);
        return { input, id: user.id, token, loginTime };
      } finally {
        await context.dispose();
      }
    });
  },
  createField: async ({ apiAs }, use) => {
    await use(async (owner, overrides) => {
      const input = buildField(overrides);
      return seeded(await apiAs(FieldsApi, owner).create(input), `create field for user ${owner.id}`);
    });
  },
  fundUser: async ({ apiAs }, use) => {
    await use(async (user, amount) => {
      const income = await apiAs(FinancialApi, user).addIncome(buildIncome(amount));
      return seeded(income, `add income ${amount} for user ${user.id}`).transaction;
    });
  },
});
