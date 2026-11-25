import { profileSchema, type UserProfile } from '#src/api/models/user.ts';
import type { MockApi } from '#src/mocks/mock-api.ts';
import { ok } from '#src/mocks/replies.ts';

/**
 * Answers the profile page's own calls. With the default flags it loads only users/profile:
 * two-factor and personal API keys are flagged off, and the page has no fields or staff list.
 */
export function mockProfile(api: MockApi, profile: UserProfile): void {
  api.on('GET', '/api/v1/users/profile', ok(profileSchema.parse(profile)));
}
