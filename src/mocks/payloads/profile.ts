import { faker } from '@faker-js/faker';
import type { UserProfile } from '#src/api/models/user.ts';
import { buildUser } from '#src/data/factories/user.factory.ts';

/** A users/profile record for mocks: a fresh user who has not logged in yet. */
export function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const { email, displayedName } = buildUser();
  return {
    id: faker.number.int({ min: 100_000, max: 999_999 }),
    email,
    displayedName,
    isActive: true,
    lastLogin: null,
    ...overrides,
  };
}
