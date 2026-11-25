import { authorizationSchema, featureFlagsSchema } from '#src/api/models/shared.ts';
import { appVersionSchema, type AppVersion } from '#src/api/models/health.ts';
import type { MockApi } from '#src/mocks/mock-api.ts';
import { buildProfile } from '#src/mocks/payloads/profile.ts';
import { defaultFeatureFlags } from '#src/mocks/payloads/shared.ts';
import { bare, ok } from '#src/mocks/replies.ts';
import type { Session } from '#src/ui/session.ts';

const appVersion: AppVersion = { version: '1.126.0' };

/**
 * Answers the calls every page makes on load (4.1): the token check, the feature flags and the
 * footer's version (outside /api/v1, bare). Installed for every ui-mocked test.
 */
export function installSharedHandlers(api: MockApi, session: Session): void {
  const user = buildProfile({ id: session.userId, displayedName: session.userLabel });
  api
    .on('GET', '/api/v1/authorization', ok(authorizationSchema.parse(user)))
    .on('GET', '/api/v1/feature-flags', ok(featureFlagsSchema.parse(defaultFeatureFlags)))
    .on('GET', '/api/version', bare(appVersionSchema.parse(appVersion)));
}
