#!/bin/bash
# Nightly osvježavanje kataloga: podaci iz fetch.domovina.tv → build → deploy.
# Namijenjeno za kraj automatic/nightly_pipeline.sh (nakon watch_candidates i
# discover.js activity), kad su registry i watch-state već svježi.
#
#   scripts/refresh.sh             # build + deploy
#   scripts/refresh.sh --no-deploy # samo build (provjera)
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/build-catalog.mjs
npx astro build

if [ "${1:-}" != "--no-deploy" ]; then
    npx wrangler deploy
fi
