#!/usr/bin/env bash
#
# Archive and export the LifeSwap iOS app.
#
# Runs on an EAS Build worker (see .eas/build/ios.yml) after the web assets are
# built and the signing credentials are installed. Kept as a real script rather
# than inline YAML: shell embedded in a build config is parsed by the YAML block
# scalar AND interpolated by EAS's template engine before bash sees it, which
# silently corrupts quoting and any `${ ... }` sequence. A file can be
# syntax-checked and dry-run locally — see scripts/eas/preflight.sh.
#
# Environment:
#   EXPORT_METHOD              ad-hoc (default) | app-store   — set in eas.json
#   EAS_BUILD_IOS_BUILD_NUMBER build number EAS tracks remotely (optional)
#   EAS_BUILD_WORKINGDIR       repo root on the worker (optional)
#   DRY_RUN                    resolve + render everything, skip xcodebuild
#
set -euo pipefail

log() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
warn() { printf 'warning: %s\n' "$*" >&2; }

DRY_RUN="${DRY_RUN:-}"

REPO_ROOT="${EAS_BUILD_WORKINGDIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PROJECT_DIR="$REPO_ROOT/ios/App"
OUTPUT_DIR="$PROJECT_DIR/output"
PBXPROJ="$PROJECT_DIR/App.xcodeproj/project.pbxproj"

[ -f "$PBXPROJ" ] || die "Xcode project not found at $PBXPROJ"

# ---------------------------------------------------------------- bundle id --
# Read the identifier xcodebuild will actually build with, so the profile
# selected below is guaranteed to match it.
BUNDLE_ID="$(
  grep -m1 -o 'PRODUCT_BUNDLE_IDENTIFIER = [^;]*' "$PBXPROJ" \
    | sed 's/^PRODUCT_BUNDLE_IDENTIFIER = //' \
    | tr -d '"'
)"
[ -n "$BUNDLE_ID" ] || die "could not read PRODUCT_BUNDLE_IDENTIFIER from $PBXPROJ"

# ------------------------------------------------------------ export method --
METHOD="${EXPORT_METHOD:-ad-hoc}"
case "$METHOD" in
  ad-hoc|app-store|development|enterprise) ;;
  *) die "unsupported EXPORT_METHOD '$METHOD'" ;;
esac

# --------------------------------------------------------- signing identity --
# Match on bundle id rather than taking the first file on disk: a worker can
# hold several profiles, and the wrong one fails at export with a misleading
# "requires a provisioning profile".
PROFILE_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
PROFILE_UUID=""
PROFILE_NAME=""
TEAM_ID=""

if [ -d "$PROFILE_DIR" ]; then
  shopt -s nullglob
  PROFILES=("$PROFILE_DIR"/*.mobileprovision)
  shopt -u nullglob
  for profile in ${PROFILES[@]+"${PROFILES[@]}"}; do
    decoded="$(security cms -D -i "$profile" 2>/dev/null)" || continue
    team="$(printf '%s' "$decoded" | plutil -extract TeamIdentifier.0 raw - 2>/dev/null)" || continue
    appid="$(printf '%s' "$decoded" | plutil -extract Entitlements.application-identifier raw - 2>/dev/null)" || continue
    if [ "${appid#"$team".}" = "$BUNDLE_ID" ]; then
      PROFILE_UUID="$(printf '%s' "$decoded" | plutil -extract UUID raw -)"
      PROFILE_NAME="$(printf '%s' "$decoded" | plutil -extract Name raw -)"
      TEAM_ID="$team"
      break
    fi
  done
fi

if [ -z "$PROFILE_UUID" ]; then
  if [ -n "$DRY_RUN" ]; then
    warn "no provisioning profile matches $BUNDLE_ID (expected off-worker); using placeholders"
    PROFILE_UUID="00000000-0000-0000-0000-000000000000"
    PROFILE_NAME="<dry-run placeholder>"
    TEAM_ID="XXXXXXXXXX"
  else
    die "no installed provisioning profile matches bundle id $BUNDLE_ID"
  fi
fi

# -------------------------------------------------------------- versioning --
# App Store Connect rejects a duplicate CFBundleVersion, so prefer the build
# number EAS tracks remotely over the static value in the pbxproj.
#
# NOTE: read this from the environment. Do NOT reference EAS's eas.job.version
# template fields — EAS interpolates a run step's whole command string (comments
# included) before bash runs, and an unresolved field fails the step outright.
BUILD_NUMBER="${EAS_BUILD_IOS_BUILD_NUMBER:-}"
APP_VERSION=""
if [ -f "$REPO_ROOT/app.json" ]; then
  APP_VERSION="$(node -p "require('$REPO_ROOT/app.json').expo.version || ''" 2>/dev/null || true)"
fi

# An array, so no value can word-split into a stray xcodebuild build action.
VERSION_ARGS=()
[ -n "$BUILD_NUMBER" ] && VERSION_ARGS+=("CURRENT_PROJECT_VERSION=$BUILD_NUMBER")
[ -n "$APP_VERSION" ]  && VERSION_ARGS+=("MARKETING_VERSION=$APP_VERSION")

log "bundle      $BUNDLE_ID"
log "profile     $PROFILE_NAME ($PROFILE_UUID)"
log "team        $TEAM_ID"
log "method      $METHOD"
log "version     ${APP_VERSION:-<from pbxproj>}"
log "build       ${BUILD_NUMBER:-<from pbxproj>}"

# ------------------------------------------------------- export options file --
write_export_options() {
  cat > "$1" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>${METHOD}</string>
  <key>teamID</key><string>${TEAM_ID}</string>
  <key>signingStyle</key><string>manual</string>
  <key>compileBitcode</key><false/>
  <key>stripSwiftSymbols</key><true/>
  <key>provisioningProfiles</key>
  <dict>
    <key>${BUNDLE_ID}</key><string>${PROFILE_UUID}</string>
  </dict>
</dict>
</plist>
PLIST
  plutil -lint "$1" >/dev/null || die "generated ExportOptions.plist is malformed"
}

if [ -n "$DRY_RUN" ]; then
  TMP_PLIST="$(mktemp -t ExportOptions).plist"
  write_export_options "$TMP_PLIST"
  log "dry run: ExportOptions.plist renders and lints cleanly"
  log "dry run: xcodebuild args ->" \
      "CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=$TEAM_ID" \
      "PROVISIONING_PROFILE_SPECIFIER=$PROFILE_UUID" \
      "${VERSION_ARGS[*]-}"
  rm -f "$TMP_PLIST"
  log "dry run complete - skipping xcodebuild"
  exit 0
fi

# ----------------------------------------------------------------- archive --
mkdir -p "$OUTPUT_DIR"
cd "$PROJECT_DIR"

xcodebuild \
  -project App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$OUTPUT_DIR/App.xcarchive" \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_UUID" \
  ${VERSION_ARGS[@]+"${VERSION_ARGS[@]}"} \
  archive

# ------------------------------------------------------------------ export --
write_export_options "$OUTPUT_DIR/ExportOptions.plist"

xcodebuild -exportArchive \
  -archivePath "$OUTPUT_DIR/App.xcarchive" \
  -exportOptionsPlist "$OUTPUT_DIR/ExportOptions.plist" \
  -exportPath "$OUTPUT_DIR"

# ------------------------------------------------------------------ verify --
IPA="$(ls "$OUTPUT_DIR"/*.ipa 2>/dev/null | head -1 || true)"
[ -n "$IPA" ] || die "export finished but produced no .ipa in $OUTPUT_DIR"

APP_PLIST="$OUTPUT_DIR/App.xcarchive/Products/Applications/App.app/Info.plist"
SHIPPED_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PLIST")"
SHIPPED_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP_PLIST")"

log "exported    $(basename "$IPA") ($(du -h "$IPA" | cut -f1))"
log "shipped     version $SHIPPED_VERSION build $SHIPPED_BUILD"

# Catch a silently-ignored build setting here rather than discovering it as a
# duplicate-build-number rejection in App Store Connect.
if [ -n "$BUILD_NUMBER" ] && [ "$SHIPPED_BUILD" != "$BUILD_NUMBER" ]; then
  die "expected CFBundleVersion $BUILD_NUMBER but the archive contains $SHIPPED_BUILD"
fi
