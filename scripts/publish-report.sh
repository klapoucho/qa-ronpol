#!/usr/bin/env bash
# Publishes a Playwright HTML report to the gh-pages branch, which GitHub Pages serves:
#   runs/<run>/   the report of that run
#   runs/         a list of the reports kept
#   /             a redirect to the newest report
# Only the newest KEEP reports stay (20 by default). The branch always holds one commit with no
# parent, so reports that were dropped do not stay in the repository's history.
#
# Usage: scripts/publish-report.sh <report-dir> <run-number>
# Run it in a checkout whose origin it may push to; CI does (the report job in tests.yml).
set -euo pipefail

report="${1:?usage: scripts/publish-report.sh <report-dir> <run-number>}"
run="${2:?usage: scripts/publish-report.sh <report-dir> <run-number>}"
keep="${KEEP:-20}"
branch="gh-pages"

[ -f "$report/index.html" ] || { echo "No report at $report/index.html." >&2; exit 1; }
case "$run" in '' | *[!0-9]*) echo "Run number must be digits, got \"$run\"." >&2; exit 1 ;; esac

site="$(mktemp -d)"
index_file="$(mktemp -u)"
trap 'rm -rf "$site" "$index_file"' EXIT

# Start from what is published. ls-remote exits with 2 when the branch does not exist yet; any other
# failure stops the script, so a network error never publishes a site without its older reports.
status=0
git ls-remote --exit-code --heads origin "$branch" >/dev/null || status=$?
if [ "$status" -eq 0 ]; then
  git fetch --quiet --depth=1 origin "$branch"
  git archive FETCH_HEAD | tar -x -C "$site"
elif [ "$status" -ne 2 ]; then
  echo "Cannot read $branch from origin (git ls-remote exit $status)." >&2
  exit 1
fi

mkdir -p "$site/runs"
rm -rf "$site/runs/$run" # a re-run of the same workflow run replaces its report
cp -R "$report" "$site/runs/$run"

kept_runs() { find "$site/runs" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort -rn; }
kept_runs | tail -n +"$((keep + 1))" | while IFS= read -r old; do
  rm -rf "$site/runs/$old"
done
newest="$(kept_runs | head -n 1)"

# Without this file GitHub Pages runs the site through Jekyll, which is slower and skips some files.
touch "$site/.nojekyll"
cat >"$site/index.html" <<EOF
<!doctype html>
<meta charset="utf-8">
<title>Playwright reports</title>
<meta http-equiv="refresh" content="0; url=runs/$newest/">
<p>Newest report: <a href="runs/$newest/">run $newest</a>. <a href="runs/">All kept reports</a>.</p>
EOF
{
  echo '<!doctype html>'
  echo '<meta charset="utf-8">'
  echo '<title>Playwright reports</title>'
  echo "<h1>Playwright reports</h1>"
  echo "<p>The newest $keep full-suite runs, newest first.</p>"
  echo '<ul>'
  kept_runs | while IFS= read -r kept; do echo "  <li><a href=\"$kept/\">run $kept</a></li>"; done
  echo '</ul>'
} >"$site/runs/index.html"

# Build the commit from the folder with a throwaway index, leaving this checkout's files alone.
export GIT_INDEX_FILE="$index_file"
export GIT_AUTHOR_NAME="github-actions[bot]" GIT_COMMITTER_NAME="github-actions[bot]"
export GIT_AUTHOR_EMAIL="41898282+github-actions[bot]@users.noreply.github.com"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
git --work-tree="$site" add --all --force
commit="$(git commit-tree "$(git write-tree)" -m "Publish the Playwright report of run $run")"
git push --quiet --force origin "$commit:refs/heads/$branch"

echo "Published run $run; kept: $(kept_runs | tr '\n' ' ')"
