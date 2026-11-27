// Restores the app's base database. Only the author runs this (see docs/requirements.md, section 9).
// The target comes from the same config as the tests (APP_ENV, BASE_URL, .env), and only an
// environment marked resettable in src/config/environments.ts may be reset.
import { config } from '#src/config/index.ts';

const baseUrl = config.BASE_URL;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function describe(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  const source = cause ?? error;
  if (source instanceof Error) {
    const code = 'code' in source ? String(source.code) : '';
    return source.message || code || source.name;
  }
  return String(source);
}

if (!config.environment.resettable) {
  fail(`APP_ENV=${config.APP_ENV}: this environment must not be reset.`);
}

let response: Response;
try {
  response = await fetch(new URL('/api/debug/database/restore-base', baseUrl), {
    method: 'POST',
    headers: config.syntheticHeaders,
  });
} catch (error) {
  fail(`Cannot reach ${baseUrl}: ${describe(error)}. ${config.environment.whenUnreachable}`);
}

const body: unknown = await response.json().catch(() => undefined);
const message =
  typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : response.statusText;

console.log(`${response.status} ${message}`);
if (!response.ok) {
  process.exit(1);
}
