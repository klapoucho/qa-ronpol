import { test, expect } from '#src/fixtures/index.ts';
import { UsersApi } from '#src/api/clients/users-api.ts';

test('registered user reads their own profile with their token', async ({ createUser, apiAs }) => {
  const user = await createUser();

  const profile = await apiAs(UsersApi, user).profile();

  expect(profile.data).toMatchObject({
    id: user.id,
    email: user.input.email,
    displayedName: user.input.displayedName,
  });
});

test('a call without a token stays anonymous after users were created', async ({ createUser, apiAs }) => {
  await createUser();

  const profile = await apiAs(UsersApi).profile();

  expect(profile.status).toBe(401);
  expect(profile.error).toBeTruthy();
});
