import { test, expect } from '#src/fixtures/index.ts';
import { buildUser } from '#src/data/factories/user.factory.ts';

test('user factory builds unique users that match the app rules', () => {
  const users = Array.from({ length: 1000 }, () => buildUser());

  expect(new Set(users.map((u) => u.email)).size).toBe(users.length);
  expect(users.filter((u) => !/^[A-Za-z0-9 _-]{3,20}$/.test(u.displayedName))).toEqual([]);
  expect(
    users.filter((u) => !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(u.password)),
  ).toEqual([]);
});

test('user factory keeps the fields a test overrides', () => {
  expect(buildUser({ displayedName: 'Fixed_Name' }).displayedName).toBe('Fixed_Name');
});
