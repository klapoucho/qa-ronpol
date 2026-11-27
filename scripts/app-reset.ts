// Restores the app's base database. Only the author runs this (see docs/requirements.md, section 9).
// It resets the dev environment only; another APP_ENV is refused (src/config/environments.ts).
const appEnv = process.env.APP_ENV ?? 'dev';
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

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

if (appEnv !== 'dev') {
  fail(`APP_ENV=${appEnv}: only the dev environment may be reset.`);
}

let url: URL;
try {
  url = new URL('/api/debug/database/restore-base', baseUrl);
} catch {
  fail(`Invalid BASE_URL "${baseUrl}": expected an absolute URL such as http://localhost:3000.`);
}

let response: Response;
try {
  response = await fetch(url, { method: 'POST' });
} catch (error) {
  fail(`Cannot reach ${baseUrl}: ${describe(error)}. Is the app running (npm run app:up)?`);
}

const body: unknown = await response.json().catch(() => undefined);
const message =
  typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : response.statusText;

console.log(`${response.status} ${message}`);
if (!response.ok) {
  process.exit(1);
}
