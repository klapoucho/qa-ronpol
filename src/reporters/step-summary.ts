import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type { FullResult, Reporter, Suite, TestCase } from '@playwright/test/reporter';

/**
 * Writes the run's result to the GitHub Actions summary page: the counts, then every failed and
 * flaky test with the first line of its error. Does nothing outside GitHub Actions.
 */
export default class StepSummaryReporter implements Reporter {
  private suite: Suite | undefined;

  printsToStdio(): boolean {
    return false;
  }

  onBegin(_config: unknown, suite: Suite): void {
    this.suite = suite;
  }

  onEnd(result: FullResult): void {
    const file = process.env.GITHUB_STEP_SUMMARY;
    if (!file || !this.suite) {
      return;
    }
    // A test that never started (its project waited for one that failed) counts as skipped.
    const tests = this.suite.allTests();
    const withOutcome = (outcome: ReturnType<TestCase['outcome']>) =>
      tests.filter((test) => test.outcome() === outcome);
    const failed = withOutcome('unexpected');
    const flaky = withOutcome('flaky');

    const lines = [
      `## Tests: ${result.status}`,
      '',
      '| Passed | Failed | Flaky | Skipped or not run | Duration |',
      '| ------ | ------ | ----- | ------------------ | -------- |',
      `| ${withOutcome('expected').length} | ${failed.length} | ${flaky.length} | ${withOutcome('skipped').length} | ${Math.round(result.duration / 1000)} s |`,
      '',
      ...section('Failed', failed),
      ...section('Flaky (passed only on retry)', flaky),
    ];
    appendFileSync(file, `${lines.join('\n')}\n`);
  }
}

function section(title: string, tests: TestCase[]): string[] {
  if (tests.length === 0) {
    return [];
  }
  return [`### ${title}`, '', ...tests.map(describe), ''];
}

function describe(test: TestCase): string {
  // titlePath() is ['', project, file, ...describes, title].
  const [, project, , ...titles] = test.titlePath();
  const location = `${path.relative(process.cwd(), test.location.file)}:${test.location.line}`;
  const message = test.results.find((attempt) => attempt.error)?.error?.message ?? 'no error message';
  const firstLine = stripVTControlCharacters(message).split('\n')[0];
  return `- **[${project}]** \`${location}\` ${titles.join(' › ')}\n  - ${firstLine}`;
}
