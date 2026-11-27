# Local settings (this machine only, ignored by git)

Copy this file to `AGENTS.local.md` and fill it in. You need it only when something on your machine
differs from `AGENTS.md`; the usual case is more than one `gh` account logged in. Claude Code users may
name the copy `CLAUDE.local.md` instead, which Claude Code loads by itself.

## QA settings

- GitHub account: <login>. Before any `gh` command, `gh api user --jq .login` must print `<login>`. If it does not, stop and ask. The fix is `gh auth switch -u <login>`.
