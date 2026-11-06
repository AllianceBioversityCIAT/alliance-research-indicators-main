#!/usr/bin/env bash
# Removes the STAR DEV frontend configuration written by write-frontend-config.sh and the caches that may hold
# transformed copies of it (Jest's transform cache when configured in the project, Angular's build cache) and the
# coverage report of the client tests. Runs as an `if: always()` step, so it also runs when a previous step failed.
# Never fails the job.
# Adapted from onecgiar_pr .github/scripts/remove-frontend-config.sh (Reporting Tool DEV): STAR path, one file.
set -uo pipefail
client="client/research-indicators"
rm -f "$client/src/environments/environment.ts"
rm -rf "$client/.jest-cache" "$client/.angular" "$client/coverage"
echo "frontend configuration and caches removed"
