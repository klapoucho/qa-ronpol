import { z } from 'zod';

export const healthcheckSchema = z.object({ status: z.string(), version: z.string() });
export type Healthcheck = z.infer<typeof healthcheckSchema>;

export const aboutSchema = z.object({ name: z.string(), version: z.string() });
export type About = z.infer<typeof aboutSchema>;

// GET /api/version answers with a bare object, not the envelope.
export const appVersionSchema = z.object({ version: z.string() });
export type AppVersion = z.infer<typeof appVersionSchema>;
