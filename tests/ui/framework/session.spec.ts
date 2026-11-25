import { test, expect } from '#src/fixtures/index.ts';

test('user logged in through cookies sees their own profile', async ({
  createUser,
  loginAs,
  profilePage,
}) => {
  const user = await createUser();
  await loginAs(user);

  await profilePage.goto();

  await expect(profilePage.details).toShowFields({
    email: user.input.email,
    displayedName: user.input.displayedName,
  });
});
