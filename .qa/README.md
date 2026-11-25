# .qa

Working folder of the `/qa-pick` skill (`.claude/skills/qa-pick/`). Everything here is committed
(D-09), except `runs/*/scratch/`.

| Path | Holds |
| --- | --- |
| `runs/<run-id>/` | One QA run: story, plan, report, results, summary and evidence. |
| `runs/<run-id>/scratch/` | Seed and probe scripts and session state. **Ignored**: it holds live tokens, which must never be committed (NFR-20). |
| `bugs/` | Bug knowledge base: one file per known bug, `<area>--<slug>.md`. |
| `notes/` | Tool notes, for example `playwright-cli.md` (symptom, cause, workaround, version). |
| `lessons.md` | Lessons applied after runs, newest first. |

## Where a run is committed (D-15)

A run's folder (without `scratch/`) and the bug files it created or updated are committed on the
run's test branch, in one `docs(qa): add qa-pick run <run-id>` commit before the push, so the
evidence reaches `main` in the same PR as the tests. At the end of the run (section 8) any later
changes (PR link, struggles, lessons in the summary) go in a `docs(qa): update qa-pick run <run-id>`
commit. A run without a test branch (automation skipped, BLOCKED, no framework) commits the same set
on `docs/qa-run-<slug>`. Lessons go with the retro's skill-edit branch, or alone on
`docs/qa-lessons-<run-id>`. Only after the commit exists are the files removed from the main
checkout.

## Rules

- No tokens or passwords in anything committed here. Grep a run folder for `token`, `password` and
  `Bearer` before committing it.
- Agents may start the app (`npm run app:up`); only the author stops or resets it (D-13).
