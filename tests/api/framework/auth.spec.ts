import { test, expect } from '#src/fixtures/index.ts';
import { UsersApi } from '#src/api/clients/users-api.ts';

test('registered user reads their own profile with their token', async ({ createUser }) => {
  const user = await createUser();

  const profile = await user.api.users.profile();

  expect(profile.data).toMatchObject({
    id: user.id,
    email: user.input.email,
    displayedName: user.input.displayedName,
  });
});

test('a call without a token stays anonymous after users were created', async ({
  createUser,
  anonymousApi,
}) => {
  await createUser();

  const profile = await anonymousApi(UsersApi).profile();

  expect(profile.status).toBe(401);
  expect(profile.error).toBeTruthy();
});
