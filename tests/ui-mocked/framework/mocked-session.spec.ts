import { test, expect } from '#src/fixtures/index.ts';
import { mockProfile } from '#src/mocks/handlers/profile.ts';
import { buildProfile } from '#src/mocks/payloads/profile.ts';

test('profile shows the user the API returns', async ({ mockApi, mockSession, profilePage }) => {
  const profile = buildProfile({ id: mockSession.userId });
  mockProfile(mockApi, profile);

  await profilePage.goto();

  await expect(profilePage.details).toShowFields({
    email: profile.email,
    displayedName: profile.displayedName,
  });
});

test('network guard records API requests no handler serves', async ({ mockApi, page, profilePage }) => {
  mockProfile(mockApi, buildProfile());
  await profilePage.goto();

  await page.evaluate(() => fetch('/api/v1/not-mocked?page=2', { method: 'POST' }));

  expect(mockApi.unhandled).toEqual(['POST /api/v1/not-mocked']);
  mockApi.clearUnhandled();
});

test('field matcher lists every mismatching field', async ({ mockApi, profilePage }) => {
  const profile = buildProfile();
  mockProfile(mockApi, profile);
  await profilePage.goto();

  // The received values prove the page rendered the profile: a page that never did reports undefined.
  await expect(
    expect(profilePage.details).toShowFields(
      { email: 'wrong@example.test', displayedName: 'Wrong' },
      { timeout: 1_000 },
    ),
  ).rejects.toThrow(
    new RegExp(
      `email: expected wrong@example\\.test, received "${RegExp.escape(profile.email)}"\\n` +
        `\\s*displayedName: expected Wrong, received "${RegExp.escape(profile.displayedName)}"`,
    ),
  );
});
