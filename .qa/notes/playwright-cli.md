# Playwright CLI notes

Quirks of `playwright-cli` seen in `/qa-pick` runs. Symptom → cause → workaround, with the version.
Never edit the upstream `playwright-cli` skill copy; record it here.

## Session output lands in the current directory (0.1.24)
- **Symptom:** after `open` / `snapshot` / `console`, a `.playwright-cli/` folder (page snapshots `page-*.yml`, console logs) appears in the run folder root, next to `report.md`. `--profile=<dir>` does not move it.
- **Cause:** the CLI writes its session output into `.playwright-cli/` under the shell's current directory.
- **Workaround:** run the CLI from the run's scratch folder (`cd {RUN_DIR}/scratch && playwright-cli -s=<session> …`) so the output stays in the ignored `scratch/`, and give screenshots an absolute `--filename`.
- Seen: 2026-11-26-issue-12-marketplace-business-rules (reviewer); reproduced with 0.1.24.

## A screenshot with a relative `--filename` is written relative to the shell's current directory (0.1.24)
- **Symptom:** `screenshot --filename=artifacts/review/x.png` did not appear in `artifacts/review/`.
- **Cause:** the path resolves against the current directory of the shell running the command, not the run folder. Agent shells can reset their directory between calls. A minimal repro with a stable current directory wrote the file where expected, so this is not a CLI bug.
- **Workaround:** always pass an absolute path: `--filename={RUN_DIR}/artifacts/<file>.png`.
- Seen: 2026-11-26-issue-12-marketplace-business-rules (reviewer); checked with 0.1.24.
