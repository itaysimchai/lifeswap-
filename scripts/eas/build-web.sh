#!/usr/bin/env bash
#
# Build the web app and copy it into the native iOS project.
# Runs on an EAS Build worker before the Xcode archive.
#
set -euo pipefail

log() { printf '==> %s\n' "$*"; }

REPO_ROOT="${EAS_BUILD_WORKINGDIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$REPO_ROOT"

log "node $(node --version)"

log "building web assets"
npx vite build

log "syncing into the Xcode project"
npx cap sync ios

# cap sync copies dist/ to ios/App/App/public. If that is missing the archive
# still succeeds but ships an empty shell, so fail loudly here instead.
PUBLIC_DIR="$REPO_ROOT/ios/App/App/public"
if [ ! -f "$PUBLIC_DIR/index.html" ]; then
  printf 'error: %s\n' "cap sync did not produce $PUBLIC_DIR/index.html" >&2
  exit 1
fi

log "web assets in place ($(find "$PUBLIC_DIR" -type f | wc -l | tr -d ' ') files)"
