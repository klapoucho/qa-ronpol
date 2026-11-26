<!-- qa-pick summary · run <run-id> -->
<!--
GitHub-flavoured Markdown: this file is posted as an issue comment (SKILL.md §5).
- Verdict emoji: ✅ PASS · ⚠️ PASS WITH FINDINGS · ❌ FAIL · ⛔ BLOCKED.
- One alert per problem, most severe first: critical/major → [!CAUTION], minor → [!WARNING], cosmetic → [!NOTE].
  No problems → a single "> [!TIP]" line saying so. BLOCKED → the blocker is problem 1.
- Images: `![alt](./artifacts/<file>.png)`, written exactly as the --attach path, so gh swaps in the uploaded URL.
  Only the evidence a reader needs to see (problems first); the rest stays a path in backticks.
- Repo paths (bug files, evidence) go in backticks: relative links don't resolve in a comment.
- Keep a blank line after every <summary> line, or the Markdown inside <details> won't render.
- Delete these comments and every unused placeholder before posting.
-->
## 🧪 QA: <story title> — <✅ PASS | ⚠️ PASS WITH FINDINGS | ❌ FAIL | ⛔ BLOCKED>

| | |
|---|---|
| **Run** | `<run-id>` · <YYYY-MM-DD> |
| **Env** | <app URL> · <app version / commit> · <web Chromium / API> |
| **Tested** | <issue / PR + head SHA, or "story text"> |
| **Roles** | <tested roles> · skipped: <role — why> |
| **Reviewer** | <coverage verdict in one line> |
| **Automation** | <writing tests · skipped — reason · PR link> |

### Problems

> [!CAUTION]
> **1. <what breaks for whom>** · <severity> · `<.qa/bugs/…md>`
>
> **Steps:** 1. … 2. …<br>
> **Expected:** …<br>
> **Actual:** …<br>
> **Env/role:** <only if different from the table above>
>
> ![<what the screenshot shows>](./artifacts/<file>.png)

### Not verified

- <item> — <reason>

<details>
<summary><b>Test cases</b> — <n> ✅ · <n> ❌ · <n> ⏭️ (R… = reviewer experiments)</summary>

| # | | Role | Case | Requirement | Evidence |
|---|---|---|---|---|---|
| 1 | ✅ | … | … | AC … | `artifacts/…` |
| R1 | ❌ | … | … | user expectation | `artifacts/review/…` |

</details>

<details>
<summary><b>Known bugs re-checked</b></summary>

- `<bug file>` — <still reproduces | fixed>

</details>

<details>
<summary><b>Run notes</b> — agents, lessons applied</summary>

- **Agents:** <role — model / effort — why>
- **Lessons applied:** <one line each, or "none yet">

</details>

<sub>Posted by <code>/qa-pick</code> · full evidence in <code>.qa/runs/&lt;run-id&gt;/</code> · 🤖 Generated with [Claude Code](https://claude.com/claude-code)</sub>
