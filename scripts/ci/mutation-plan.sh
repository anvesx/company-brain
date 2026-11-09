#!/usr/bin/env bash
# Prints the JSON list of packages whose mutation job must run, e.g.
# [{"name":"@anvesx/core-types","dir":"features/core-types"}].
# Pull requests mutate only changed packages and their dependents; pushes to
# main and any change to shared CI config mutate every package. Thresholds are
# never touched here: each package keeps its own break score.
set -euo pipefail

base="${MUTATION_BASE:-origin/main}"
event="${GITHUB_EVENT_NAME:-pull_request}"
shared='^(\.github/workflows/ci\.yml|scripts/ci/|turbo\.json|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)'

filter=()
if [ "$event" = "pull_request" ]; then
  changed="$(git diff --name-only "$base"...HEAD)"
  if ! printf '%s\n' "$changed" | grep -Eq "$shared"; then
    filter=("--filter=...[$base]")
  fi
fi

plan="$(pnpm --silent turbo run mutation ${filter[@]+"${filter[@]}"} --dry=json)"
# pnpm may print warnings before the JSON; keep from the first line that is "{".
# turbo lists the task for every package, so keep only those with a mutation script.
printf '%s\n' "$plan" | sed -n '/^{$/,$p' \
  | jq -c '[.tasks[] | select(.task == "mutation") | {name: .package, dir: .directory}] | unique_by(.name) | sort_by(.name)' \
  | jq -c --argjson has "$(for pj in */*/package.json; do
      jq -c --arg d "$(dirname "$pj")" 'select(.scripts.mutation) | $d' "$pj"
    done | jq -sc '.')" '[.[] | select(.dir as $d | $has | index($d))]'
