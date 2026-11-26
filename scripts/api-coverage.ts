// Measures API test coverage against Rolnopol's OpenAPI contract (D-18, FR-21).
//
// The denominator is the checked-in contract, docs/api/openapi.json. When the app is reachable, the
// script first compares it with the live /schema/openapi.json and stops on any difference in
// operations or documented statuses, so a stale snapshot never becomes the denominator.
//
// The numerator comes from `playwright test --list` for the api project: a test counts for an
// operation when it sits in a describe titled `<METHOD> <path>` (`POST /api/v1/marketplace/offers`),
// and for a response when it also sits in a nested describe titled with the status (`'400'`).
// Skipped tests (`test.skip`, `test.fixme`) prove nothing, so they never count.
//
// Usage:
//   node scripts/api-coverage.ts [--area <OpenAPI tag>]... [--update-contract]
// The Markdown report goes to stdout; warnings go to stderr.
//   --area             also list every operation of this area, tested or not (repeatable)
//   --update-contract  replace docs/api/openapi.json with the live contract, then report
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { config } from '#src/config/index.ts';

// Paths resolve from the repo root, so the script works from any directory.
const ROOT = join(import.meta.dirname, '..');
const CONTRACT_FILE = 'docs/api/openapi.json';
const CONTRACT_PATH = '/schema/openapi.json';
const PROJECT = 'api';
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const OPERATION_TITLE = /^(GET|POST|PUT|PATCH|DELETE) (\/\S*)$/;
const STATUS_TITLE = /^[1-5]\d\d$/;

// ---------- contract ----------

const operationSchema = z.object({
  tags: z.array(z.string()).optional(),
  responses: z.record(z.string(), z.unknown()).default({}),
});

const contractSchema = z.object({
  info: z.object({ title: z.string(), version: z.string() }),
  servers: z.array(z.object({ url: z.string() })).default([]),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
});

type Operation = { key: string; area: string; statuses: string[] };
type Contract = { title: string; version: string; basePath: string; operations: Map<string, Operation> };

function parseContract(json: unknown, source: string): Contract {
  const parsed = contractSchema.safeParse(json);
  if (!parsed.success) {
    fail(`${source} is not an OpenAPI document: ${parsed.error.issues[0]?.message ?? 'unknown error'}`);
  }
  const { info, servers, paths } = parsed.data;
  // Test titles use the path the app serves, so the first server's base path prefixes every path.
  const basePath = (servers[0]?.url ?? '').replace(/\/$/, '');
  const operations = new Map<string, Operation>();
  for (const [path, item] of Object.entries(paths)) {
    for (const method of METHODS) {
      if (item[method] === undefined) {
        continue;
      }
      const operation = operationSchema.parse(item[method]);
      const key = `${method.toUpperCase()} ${basePath}${path}`;
      const statuses = Object.keys(operation.responses).filter((status) => STATUS_TITLE.test(status));
      operations.set(key, { key, area: operation.tags?.[0] ?? 'Untagged', statuses: statuses.sort() });
    }
  }
  return { title: info.title, version: info.version, basePath, operations };
}

async function fetchLiveContract(): Promise<unknown> {
  const url = new URL(CONTRACT_PATH, config.BASE_URL);
  try {
    const response = await fetch(url, {
      headers: config.syntheticHeaders,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      warn(`${url.href} answered ${response.status}; the live contract was not checked.`);
      return undefined;
    }
    return await response.json();
  } catch {
    warn(`Cannot reach ${url.href}; the live contract was not checked. Start the app with: npm run app:up`);
    return undefined;
  }
}

function contractDrift(snapshot: Contract, live: Contract): string[] {
  const lines: string[] = [];
  for (const [key, operation] of live.operations) {
    const known = snapshot.operations.get(key);
    if (!known) {
      lines.push(`  + ${key} (${operation.statuses.join(', ')})`);
    } else if (known.statuses.join() !== operation.statuses.join()) {
      lines.push(`  ~ ${key}: ${known.statuses.join(', ')} -> ${operation.statuses.join(', ')}`);
    }
  }
  for (const key of snapshot.operations.keys()) {
    if (!live.operations.has(key)) {
      lines.push(`  - ${key}`);
    }
  }
  return lines;
}

// ---------- tests ----------

type ListTest = { projectName: string; expectedStatus?: string };
type ListSpec = { title: string; file: string; line: number; tests: ListTest[] };
type ListSuite = { title: string; file?: string; line?: number; suites?: ListSuite[]; specs?: ListSpec[] };

const listSpecSchema = z.object({
  title: z.string(),
  file: z.string(),
  line: z.number(),
  tests: z.array(z.object({ projectName: z.string(), expectedStatus: z.string().optional() })),
});
const listSuiteSchema: z.ZodType<ListSuite> = z.object({
  title: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  get suites() {
    return z.array(listSuiteSchema).optional();
  },
  specs: z.array(listSpecSchema).optional(),
});
const listReportSchema = z.object({
  suites: z.array(listSuiteSchema).default([]),
  errors: z.array(z.object({ message: z.string().optional() })).default([]),
});

type TestEntry = { title: string; location: string; skipped: boolean; operation?: string; status?: string };

// Returns the suites, or the failure output. It never exits itself, so its finally block always
// removes the temporary folder.
function listTests(): ListSuite[] | string {
  const dir = mkdtempSync(join(tmpdir(), 'api-coverage-'));
  const output = join(dir, 'list.json');
  try {
    const result = spawnSync(
      'npx',
      ['playwright', 'test', '--list', '--reporter=json', `--project=${PROJECT}`],
      {
        cwd: ROOT,
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: output },
        encoding: 'utf8',
      },
    );
    if (result.status !== 0) {
      return result.stderr || result.stdout || `exit status ${result.status ?? result.signal ?? 'unknown'}`;
    }
    const report = listReportSchema.parse(JSON.parse(readFileSync(output, 'utf8')));
    if (report.errors.length > 0) {
      return report.errors.map((error) => error.message ?? 'unknown error').join('\n');
    }
    return report.suites;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function collectTests(suites: ListSuite[], layoutWarnings: string[]): TestEntry[] {
  const entries: TestEntry[] = [];

  const walk = (suite: ListSuite, operation: string | undefined, status: string | undefined): void => {
    const where = `${suite.file ?? '?'}:${suite.line ?? '?'}`;
    const operationMatch = OPERATION_TITLE.exec(suite.title);
    if (operationMatch) {
      if (operation) {
        layoutWarnings.push(`${where}: operation group "${suite.title}" sits inside "${operation}"`);
      }
      operation = suite.title;
      status = undefined;
      const statuses = (suite.suites ?? [])
        .map((child) => child.title)
        .filter((title) => STATUS_TITLE.test(title));
      if (statuses.join() !== [...statuses].sort().join()) {
        layoutWarnings.push(
          `${where}: status groups of "${suite.title}" are not ascending (${statuses.join(', ')})`,
        );
      }
    } else if (STATUS_TITLE.test(suite.title)) {
      if (!operation) {
        layoutWarnings.push(`${where}: status group "${suite.title}" is not inside an operation group`);
      } else {
        status = suite.title;
      }
    }

    for (const spec of suite.specs ?? []) {
      const test = spec.tests.find((candidate) => candidate.projectName === PROJECT);
      if (!test) {
        continue;
      }
      const location = `${spec.file}:${spec.line}`;
      if (operation && !status) {
        layoutWarnings.push(`${location}: "${spec.title}" is in "${operation}" but in no status group`);
      }
      const skipped = test.expectedStatus === 'skipped';
      entries.push({ title: spec.title, location, skipped, operation, status });
    }
    for (const child of suite.suites ?? []) {
      walk(child, operation, status);
    }
  };

  for (const suite of suites) {
    walk(suite, undefined, undefined);
  }
  return entries;
}

// ---------- report ----------

function ratio(part: number, whole: number): string {
  const percent = whole === 0 ? 0 : (part / whole) * 100;
  return `${part} / ${whole} (${percent.toFixed(1)}%)`;
}

function table(header: string[], rows: string[][]): string[] {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
}

function report(
  contract: Contract,
  liveCheck: string,
  tests: TestEntry[],
  focusAreas: string[],
  layoutWarnings: string[],
): string {
  const tested = new Map<string, Map<string, number>>();
  const counted = tests.filter((test) => !test.skipped);
  for (const test of counted) {
    if (!test.operation) {
      continue;
    }
    const statuses = tested.get(test.operation) ?? new Map<string, number>();
    const status = test.status ?? '';
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
    tested.set(test.operation, statuses);
  }
  const testedStatuses = (key: string): string[] =>
    [...(tested.get(key)?.keys() ?? [])].filter(Boolean).sort();

  const operations = [...contract.operations.values()];
  const areas = [...new Set(operations.map((operation) => operation.area))];
  const summarise = (subset: Operation[]) => {
    let responses = 0;
    let coveredResponses = 0;
    let coveredOperations = 0;
    let completeOperations = 0;
    for (const operation of subset) {
      const covered = operation.statuses.filter((status) => testedStatuses(operation.key).includes(status));
      responses += operation.statuses.length;
      coveredResponses += covered.length;
      coveredOperations += tested.has(operation.key) ? 1 : 0;
      completeOperations += tested.has(operation.key) && covered.length === operation.statuses.length ? 1 : 0;
    }
    return { responses, coveredResponses, coveredOperations, completeOperations };
  };

  const undocumented: string[][] = [];
  for (const [key, statuses] of tested) {
    const operation = contract.operations.get(key);
    for (const [status, count] of statuses) {
      if (operation && status && !operation.statuses.includes(status)) {
        undocumented.push([`\`${key}\``, status, String(count)]);
      }
    }
  }
  const unknownOperations = [...tested.keys()].filter((key) => !contract.operations.has(key));
  const grouped = counted.filter((test) => test.operation).length;
  const total = summarise(operations);

  const lines: string[] = [
    '# API coverage',
    '',
    `Contract: \`${CONTRACT_FILE}\` (${contract.title} OpenAPI, \`info.version\` ${contract.version}, ${operations.length} operations). ${liveCheck}`,
    '',
    `Tests: \`playwright test --list --project=${PROJECT}\`. A test counts for an operation inside a \`<METHOD> <path>\` describe, and for a response inside a nested status describe (FR-21). Skipped tests never count.`,
    '',
    '## Summary',
    '',
    ...table(
      ['Signal', 'Result'],
      [
        ['Operations with at least one test', ratio(total.coveredOperations, operations.length)],
        ['Documented responses with a test', ratio(total.coveredResponses, total.responses)],
        [
          'Operations with every documented response tested',
          ratio(total.completeOperations, operations.length),
        ],
        ['API tests in an operation group', String(grouped)],
        [
          'API tests outside any operation group (scenarios, framework checks)',
          String(counted.length - grouped),
        ],
        [
          'Skipped API tests (`test.skip`, `test.fixme`; never counted)',
          String(tests.length - counted.length),
        ],
        ['Tested responses the contract does not document', String(undocumented.length)],
        ['Tested operations the contract does not list', String(unknownOperations.length)],
      ],
    ),
    '',
    '## By area',
    '',
    ...table(
      ['Area (OpenAPI tag)', 'Operations tested', 'Documented responses tested'],
      areas.map((area) => {
        const subset = operations.filter((operation) => operation.area === area);
        const summary = summarise(subset);
        return [
          area,
          ratio(summary.coveredOperations, subset.length),
          ratio(summary.coveredResponses, summary.responses),
        ];
      }),
    ),
  ];

  const detailAreas = areas.filter(
    (area) =>
      focusAreas.includes(area) ||
      operations.some((operation) => operation.area === area && tested.has(operation.key)),
  );
  for (const area of detailAreas) {
    lines.push('', `## ${area}`, '');
    lines.push(
      ...table(
        ['Operation', 'Documented', 'Tested', 'Missing', 'Tested, not documented'],
        operations
          .filter((operation) => operation.area === area)
          .map((operation) => {
            const done = testedStatuses(operation.key);
            const list = (statuses: string[]) => statuses.join(', ') || '-';
            return [
              `\`${operation.key}\``,
              list(operation.statuses),
              tested.has(operation.key)
                ? list(done.filter((status) => operation.statuses.includes(status)))
                : 'no tests',
              list(operation.statuses.filter((status) => !done.includes(status))),
              list(done.filter((status) => !operation.statuses.includes(status))),
            ];
          }),
      ),
    );
  }

  if (undocumented.length > 0) {
    lines.push(
      '',
      '## Tested responses the contract does not document',
      '',
      'Each one is a contract gap: the app answers with a status its OpenAPI does not list. File it as a `contract` bug (`.claude/skills/testing-rules/api.md`).',
      '',
      ...table(['Operation', 'Status', 'Tests'], undocumented),
    );
  }
  if (unknownOperations.length > 0) {
    lines.push(
      '',
      '## Tested operations the contract does not list',
      '',
      'A typo in the describe title, or an endpoint missing from the OpenAPI (then a `contract` bug).',
      '',
      ...unknownOperations.map((key) => `- \`${key}\``),
    );
  }
  if (layoutWarnings.length > 0) {
    lines.push('', '## Layout warnings', '', ...layoutWarnings.map((warning) => `- ${warning}`));
  }
  return `${lines.join('\n')}\n`;
}

// ---------- main ----------

function warn(message: string): void {
  console.error(`api-coverage: ${message}`);
}

function fail(message: string): never {
  console.error(`api-coverage: ${message}`);
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    area: { type: 'string', multiple: true, default: [] },
    'update-contract': { type: 'boolean', default: false },
  },
});

const liveJson = await fetchLiveContract();
if (args['update-contract']) {
  if (liveJson === undefined) {
    fail('--update-contract needs the running app.');
  }
  parseContract(liveJson, CONTRACT_PATH);
  writeFileSync(join(ROOT, CONTRACT_FILE), `${JSON.stringify(liveJson, null, 2)}\n`);
  warn(`Updated ${CONTRACT_FILE} from ${config.BASE_URL}${CONTRACT_PATH}.`);
}

const contract = parseContract(JSON.parse(readFileSync(join(ROOT, CONTRACT_FILE), 'utf8')), CONTRACT_FILE);
let liveCheck = `Not compared with the live contract: the app at ${config.BASE_URL} was not reachable.`;
if (liveJson !== undefined) {
  const drift = contractDrift(contract, parseContract(liveJson, CONTRACT_PATH));
  if (drift.length > 0) {
    fail(
      `${CONTRACT_FILE} differs from ${config.BASE_URL}${CONTRACT_PATH} (+ added, - removed, ~ statuses):\n${drift.join('\n')}\n` +
        'Check that the app is the expected version, then run: npm run coverage:api -- --update-contract',
    );
  }
  liveCheck = `Matches the live contract at ${config.BASE_URL}${CONTRACT_PATH}.`;
}

const suites = listTests();
if (typeof suites === 'string') {
  fail(`playwright test --list failed:\n${suites}`);
}
const layoutWarnings: string[] = [];
const tests = collectTests(suites, layoutWarnings);
for (const warning of layoutWarnings) {
  warn(warning);
}
for (const area of args.area) {
  if (![...contract.operations.values()].some((operation) => operation.area === area)) {
    warn(`--area ${area}: no operation has this tag.`);
  }
}
process.stdout.write(report(contract, liveCheck, tests, args.area, layoutWarnings));
