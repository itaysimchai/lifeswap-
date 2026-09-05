#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Open this project on a Mac with Xcode 26 or newer to build the iOS application."
  exit 1
fi
command -v npm >/dev/null || { echo "Install Node.js 22 or newer first."; exit 1; }
xcodebuild -version
npm ci
npm run ios:sync
open ios/App/App.xcodeproj
