import { z } from 'zod';

const envSchema = z.object({
  BASE_URL: z.url({ protocol: /^https?$/ }).default('http://localhost:3000'),
  TEST_ENV: z.enum(['local', 'ci']).default('local'),
  EXPECTED_APP_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Expected a version like 1.126.0')
    .default('1.126.0'),
  // A local, non-secret value. The default must match SYNTHETIC_TOKEN in compose.yaml.
  SYNTHETIC_TOKEN: z.string().min(1).default('local-synthetic-token'),
  RESET_DB: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Env = z.output<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const lines = result.error.issues.map((issue) => `  ${String(issue.path[0])}: ${issue.message}`);
  throw new Error(['Invalid configuration:', ...lines].join('\n'));
}
