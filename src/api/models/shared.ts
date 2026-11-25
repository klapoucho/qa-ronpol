import { z } from 'zod';
import { profileSchema } from '#src/api/models/user.ts';

// Every page calls these on load (4.1). Both answer inside the envelope.

// GET /api/v1/authorization: the user the token belongs to, the same record as users/profile.
export const authorizationSchema = profileSchema;
export type Authorization = z.infer<typeof authorizationSchema>;

// GET /api/v1/feature-flags. The frontend reads only `flags`; the admin fields the endpoint also
// returns (experimentalFlags, storedFlags, overrides) are not modelled.
export const featureFlagsSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
  updatedAt: z.string().nullable().optional(),
});
export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
