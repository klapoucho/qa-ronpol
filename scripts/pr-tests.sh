#!/usr/bin/env bash
# Runs the tests a pull request needs: the @smoke files plus every test file the change touches.
# Playwright's --only-changed follows imports from test files, so a change in src/ selects the
# tests that use it. Files it cannot follow (config, global setup, dependencies, the app version
# in compose.yaml, CI) can affect any test, so a change to one of them runs the full suite.
#
# Usage: scripts/pr-tests.sh <base-ref>     e.g. scripts/pr-tests.sh origin/main
# DRY_RUN=1 prints the selection without running it.
set -euo pipefail

base="${1:?usage: scripts/pr-tests.sh <base-ref>}"
changed="$(git diff --name-only "$base...HEAD")"

full=""
while IFS= read -r file; do
  [ -z "$file" ] && continue
  case "$file" in
    tests/global-setup.ts | src/config/*) full="$file" ;; # not reached through test imports
    tests/* | src/*) ;;                                   # followed by --only-changed
    *.md | docs/* | .claude/* | .qa/*) ;;                 # cannot change a test result
    *) full="$file" ;;                                    # config, dependencies, app, CI
  esac
done <<<"$changed"

if [ -n "$full" ]; then
  echo "Full suite: $full can affect any test."
  [ -n "${DRY_RUN:-}" ] || exec npx playwright test
  exit 0
fi

# A failing listing (a bad ref, a broken import) stops the script: set -e covers these assignments.
# --pass-with-no-tests only allows a change that touches no test file.
smoke="$(npx playwright test --list --grep @smoke)"
touched="$(npx playwright test --list --only-changed="$base" --pass-with-no-tests)"
spec_files() { grep -oE 'tests/[^ :]+\.spec\.ts' <<<"$1" | sort -u || true; }

if [ -z "$(spec_files "$smoke")" ]; then
  echo "No @smoke tests found; a pull request must run at least the smoke tests." >&2
  exit 1
fi
files="$(printf '%s\n%s\n' "$(spec_files "$smoke")" "$(spec_files "$touched")" | sed '/^$/d' | sort -u)"

echo "Smoke files and test files the change touches:"
echo "$files" | sed 's/^/  /'
# shellcheck disable=SC2086 # one argument per file; the paths contain no spaces
[ -n "${DRY_RUN:-}" ] || exec npx playwright test $files
