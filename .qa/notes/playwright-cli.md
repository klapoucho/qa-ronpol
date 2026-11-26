# Playwright CLI notes

Quirks of `playwright-cli` seen in `/qa-pick` runs. Symptom → cause → workaround, with the version.
Never edit the upstream `playwright-cli` skill copy; record it here.

## Session output lands in the current directory (0.1.24)
- **Symptom:** after `open` / `snapshot` / `console`, a `.playwright-cli/` folder (page snapshots `page-*.yml`, console logs) appears in the run folder root, next to `report.md`. `--profile=<dir>` does not move it.
- **Cause:** the CLI writes its session output into `.playwright-cli/` under the shell's current directory.
- **Workaround:** run the CLI from the run's scratch folder (`cd {RUN_DIR}/scratch && playwright-cli -s=<session> …`) so the output stays in the ignored `scratch/`, and give screenshots an absolute `--filename`.
- Seen: 2026-11-26-issue-12-marketplace-business-rules (reviewer); reproduced with 0.1.24.
- Seen again: 2026-11-26-issue-15-marketplace-browse-renders-api-data (reviewer): `snapshot` without `--filename` prints the snapshot inline and writes `page-*.yml` under the shell's current directory, not under the folder the agent expected; reproduced with 0.1.24.

## A screenshot with a relative `--filename` is written relative to the shell's current directory (0.1.24)
- **Symptom:** `screenshot --filename=artifacts/review/x.png` did not appear in `artifacts/review/`.
- **Cause:** the path resolves against the current directory of the shell running the command, not the run folder. Agent shells can reset their directory between calls. A minimal repro with a stable current directory wrote the file where expected, so this is not a CLI bug.
- **Workaround:** always pass an absolute path: `--filename={RUN_DIR}/artifacts/<file>.png`.
- Seen: 2026-11-26-issue-12-marketplace-business-rules (reviewer); checked with 0.1.24.

## The default browser is the installed Google Chrome, with an "unsupported command-line flag" bar (0.1.24)
- **Symptom:** a headed session shows a grey bar: "You are using an unsupported command-line flag: --disable-blink-features=AutomationControlled. Stability and security will suffer."
- **Cause:** with no `--browser` or config, the CLI launches the `chrome` channel (the installed Google Chrome, 158.0.8127.88 on 2026-11-26), not Playwright's bundled Chromium. For every Chromium launch it adds `--disable-blink-features=AutomationControlled` (unless an argument with `--disable-blink-features` is already given), so `navigator.webdriver` is `false`. Chrome warns about that flag.
- **Workaround:** none needed: the bar is browser chrome, not in page screenshots; it only shortens the headed viewport. Manual QA keeps the CLI default; automated tests run on Playwright Test's bundled Chromium (the versions may differ). Name the real browser and version in env lines: `run-code "async page => page.context().browser().version()"`.
- Seen: 2026-11-26-issue-13-marketplace-seller-lists-an-item (author); reproduced with 0.1.24.

## The default viewport is 1280x720 (0.1.24)
- **Symptom:** the reviewer's layout measurements were at 1280x720 while the tester's were at 1366x768.
- **Cause:** a headless session opens at 1280x720 (`page.viewportSize()`); the tester's skill resizes, the reviewer's did not.
- **Workaround:** `playwright-cli -s=<session> resize 1366 768` right after `open`, and state the viewport next to every geometry claim.
- Seen: 2026-11-26-issue-13-marketplace-seller-lists-an-item (reviewer); reproduced with 0.1.24.

## `run-code` prints the code it ran, secrets included (0.1.24)
- **Symptom:** the output of `run-code` (inline or `--filename`) starts with a "Ran Playwright code" block that repeats the whole code, so a token pasted into a cookie-login script lands in the terminal and in any file the output is saved to.
- **Cause:** the CLI echoes the executed code before the result.
- **Workaround:** never save raw `run-code` output as evidence; keep only the `### Result` part (for example `| tail -1`), and keep tokens out of artifacts.
- Seen: 2026-11-26-issue-13-marketplace-seller-lists-an-item (tester); reproduced with 0.1.24.

## `run-code` has no Node or DOM globals such as `process` or `document` (0.1.24)
- **Symptom:** a `run-code --filename` script using `process.env` failed with "ReferenceError: process is not defined" after its click had already fired, which left a stray offer in the app. `typeof process` returns `"undefined"`.
- **Symptom (DOM):** a script that used `document` outside `page.evaluate` threw a ReferenceError after its buy had already completed, so the result was lost. `typeof document` also returns `"undefined"`.
- **Cause:** the code runs in the CLI's Playwright context, neither as a Node script nor in the page.
- **Workaround:** inline values (absolute paths, ids) into the code, put every DOM access inside `page.evaluate`, read everything a script needs before its first action, and log any data a failed script left behind.
- Seen: 2026-11-26-issue-13-marketplace-seller-lists-an-item (tester), 2026-11-26-issue-14-marketplace-buyer-buys-an-offer (reviewer, `document`); reproduced with 0.1.24.

## A screenshot right after `waitFor()` can catch a modal mid-animation (0.1.24)
- **Symptom:** a screenshot taken right after `getByTestId('confirmation-modal').waitFor()` showed an empty dimmed page: the modal's content was at opacity 0 during its 0.3 s slide-in.
- **Cause:** `waitFor()` waits for visibility, and an element at opacity 0 counts as visible; it does not wait for CSS transitions. A repro with a 0.3 s opacity transition returns `"0"` right after `waitFor()`.
- **Workaround:** before capturing, wait until the computed opacity is 1 (or about 600 ms), and say in the report what the screenshot shows.
- Seen: 2026-11-26-issue-14-marketplace-buyer-buys-an-offer (reviewer); reproduced with 0.1.24.

## `console error` output accumulates per page load (0.1.24)
- **Symptom:** console files saved after later steps repeat earlier errors, and several "0 errors" files are byte-identical, which the duplicate check flags.
- **Cause:** the command reports every error since the page loaded, not since the last call.
- **Workaround:** explain repeated errors in the report's Console section and never cite a console file as the only evidence for a PASS.
- Seen: 2026-11-26-issue-13-marketplace-seller-lists-an-item (tester); observed, not re-run.

## `run-code --filename` fails on a file ending with `};` (0.1.24)
- **Symptom:** `run-code --filename=case.js` answers "SyntaxError: Unexpected token ';'" for a file `async page => { … };`.
- **Cause:** the CLI wraps the file's text as `await (<text>)(page);`, so a trailing semicolon lands inside the parentheses.
- **Workaround:** end the file with the function's closing brace, no semicolon (a formatter may add it back: keep these files out of Prettier's reach, in `scratch/`).
- Seen: 2026-11-26-issue-15-marketplace-browse-renders-api-data (tester); reproduced with 0.1.24.

## `eval` prints a returned string JSON-encoded (0.1.24)
- **Symptom:** `eval "JSON.stringify({a:1})"` prints `"{\"a\":1}"` under `### Result`, followed by a "Ran Playwright code" block; slicing the output by line numbers cut the value.
- **Cause:** the result is always printed as JSON, so a string result is quoted and escaped once more.
- **Workaround:** take the line right after `### Result` and `JSON.parse` it twice, or return an object and parse once.
- Seen: 2026-11-26-issue-15-marketplace-browse-renders-api-data (tester); reproduced with 0.1.24.

## `requests` hides static files and covers the whole session (0.1.24)
- **Symptom:** `requests` listed only a part of the page's requests, and no view per navigation.
- **Cause:** by default it leaves out static files ("N static requests not shown, run with --static"), and it lists every request since the session opened, earlier pages included.
- **Workaround:** add `--static` for the full list; to see one step's calls, record them inside a `run-code` case with `page.on('request')` and return them in the result. Redirecting the output to a file works (an empty file seen once did not reproduce).
- Seen: 2026-11-26-issue-15-marketplace-browse-renders-api-data (tester); reproduced with 0.1.24.
