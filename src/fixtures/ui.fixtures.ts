import { test as base } from '@playwright/test';
import type { TestUser } from '#src/fixtures/api.fixtures.ts';
import { sessionCookies, toSession } from '#src/ui/session.ts';
import { ProfilePage } from '#src/ui/pages/profile-page.ts';

export type LoginAs = (user: TestUser) => Promise<void>;

export const test = base.extend<{ loginAs: LoginAs; profilePage: ProfilePage }>({
  loginAs: async ({ context, baseURL }, use) => {
    await use(async (user) => {
      await context.addCookies(sessionCookies(toSession(user), baseURL ?? ''));
    });
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
});
