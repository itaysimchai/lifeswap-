#!/usr/bin/env bash
#
# Build the web app and copy it into the native iOS project.
# Runs on an EAS Build worker before the Xcode archive.
#
# Environment:
#   CAP_SERVER_URL  when set, the app loads from this dev server instead of its
#                   bundled assets (Capacitor live reload). Set per build profile
#                   in eas.json - development only, never production.
#
set -euo pipefail

log() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

REPO_ROOT="${EAS_BUILD_WORKINGDIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$REPO_ROOT"

INFO_PLIST="$REPO_ROOT/ios/App/App/Info.plist"
CAP_CONFIG="$REPO_ROOT/capacitor.config.json"

log "node $(node --version)"

# ------------------------------------------------------- live reload (dev) --
# Capacitor's own docs: server.url is "not intended for use in production".
# It is injected here rather than committed so a production build can never
# accidentally ship pointing at someone's laptop.
if [ -n "${CAP_SERVER_URL:-}" ]; then
  log "live reload enabled -> $CAP_SERVER_URL"

  node -e '
    const fs=require("fs");
    const p=process.argv[1], url=process.argv[2];
    const c=JSON.parse(fs.readFileSync(p,"utf8"));
    c.server={...(c.server||{}), url, cleartext:true};
    fs.writeFileSync(p, JSON.stringify(c,null,2)+"\n");
  ' "$CAP_CONFIG" "$CAP_SERVER_URL"

  # iOS blocks plain HTTP by default (ATS) and, since iOS 14, needs explicit
  # permission to reach local-network addresses at all.
  PB=/usr/libexec/PlistBuddy
  "$PB" -c "Delete :NSAppTransportSecurity" "$INFO_PLIST" 2>/dev/null || true
  "$PB" -c "Add :NSAppTransportSecurity dict" "$INFO_PLIST"
  "$PB" -c "Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool true" "$INFO_PLIST"
  "$PB" -c "Delete :NSLocalNetworkUsageDescription" "$INFO_PLIST" 2>/dev/null || true
  "$PB" -c "Add :NSLocalNetworkUsageDescription string 'LifeSwap connects to a development server on your local network for live reload.'" "$INFO_PLIST"
  plutil -lint "$INFO_PLIST" >/dev/null || die "Info.plist broke while adding live-reload keys"
  log "added ATS + local network entitlements for live reload"
else
  log "no CAP_SERVER_URL - bundling web assets (production behaviour)"
fi

log "building web assets"
npx vite build

log "syncing into the Xcode project"
npx cap sync ios

# cap sync copies dist/ to ios/App/App/public. If that is missing the archive
# still succeeds but ships an empty shell, so fail loudly here instead.
PUBLIC_DIR="$REPO_ROOT/ios/App/App/public"
if [ ! -f "$PUBLIC_DIR/index.html" ]; then
  die "cap sync did not produce $PUBLIC_DIR/index.html"
fi

log "web assets in place ($(find "$PUBLIC_DIR" -type f | wc -l | tr -d ' ') files)"
