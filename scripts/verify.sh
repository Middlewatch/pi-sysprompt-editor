#!/usr/bin/env bash
# pi-sysprompt-editor gate: reproducible install, static checks, and unit
# tests of the template splice. Tests make no provider request; the
# dependency install may access the npm registry.
set -euo pipefail
cd "$(dirname "$0")/.."

# Toolchain pin: the test runner relies on node 22's --experimental-strip-types.
node_major="$(node --version | sed 's/^v\([0-9]*\).*/\1/')"
if [ "$node_major" != "22" ]; then
  echo "verify: node 22.x required, found $(node --version)" >&2
  exit 1
fi

npm ci --ignore-scripts --no-audit --no-fund
npm run format:check
npm run typecheck
npm run test:unit
