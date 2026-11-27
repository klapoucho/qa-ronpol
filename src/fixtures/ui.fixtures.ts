import { test as base } from '@playwright/test';
import type { TestUser } from '#src/fixtures/test-user.ts';
import { sessionCookies, toSession } from '#src/ui/session.ts';
import { MarketplacePage } from '#src/ui/pages/marketplace-page.ts';

export type LoginAs = (user: TestUser) => Promise<void>;

export const test = base.extend<{
  loginAs: LoginAs;
  marketplacePage: MarketplacePage;
}>({
  loginAs: async ({ context, baseURL }, use) => {
    await use(async (user) => {
      await context.addCookies(sessionCookies(toSession(user), baseURL ?? ''));
    });
  },
  marketplacePage: async ({ page }, use) => {
    await use(new MarketplacePage(page));
  },
});
