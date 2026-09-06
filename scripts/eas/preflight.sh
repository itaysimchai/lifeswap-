#!/usr/bin/env bash
#
# Static checks for the iOS build pipeline. Run before pushing a build config
# change — every failure below has cost a real EAS build at least once.
#
#   npm run verify:ios
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

FAILED=0
pass() { printf '  \033[32mok\033[0m   %s\n' "$*"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; FAILED=1; }
head() { printf '\n\033[1m%s\033[0m\n' "$*"; }

head "Build config"

node -e 'JSON.parse(require("fs").readFileSync("eas.json","utf8"))' 2>/dev/null \
  && pass "eas.json is valid JSON" || fail "eas.json is not valid JSON"

# EAS interpolates '${ ... }' (brace + space) across a run step's entire command
# string, comments included. An unknown field fails the build with
# 'Object field "..." does not exist'. Bash's own ${VAR} has no space, so this
# only catches the dangerous form.
if grep -rn '\${ ' .eas/ >/dev/null 2>&1; then
  fail "EAS template syntax found in .eas/ (see below) - move it out or drop it"
  grep -rn '\${ ' .eas/ | sed 's/^/       /'
else
  pass "no EAS template syntax in .eas/"
fi

# Every script a workflow references must actually exist.
MISSING=0
while IFS= read -r script; do
  [ -f "$script" ] || { fail "workflow references missing script: $script"; MISSING=1; }
done < <(grep -rho 'scripts/eas/[A-Za-z0-9_-]*\.sh' .eas/ | sort -u)
[ "$MISSING" -eq 0 ] && pass "all scripts referenced by .eas/ exist"

head "Shell scripts"

for script in scripts/eas/*.sh; do
  bash -n "$script" 2>/dev/null \
    && pass "$script parses" \
    || { fail "$script has a syntax error"; bash -n "$script"; }
done

if command -v shellcheck >/dev/null 2>&1; then
  for script in scripts/eas/*.sh; do
    shellcheck -S warning "$script" >/dev/null 2>&1 \
      && pass "shellcheck clean: $script" \
      || { fail "shellcheck findings in $script"; shellcheck -S warning "$script" | sed 's/^/       /'; }
  done
else
  printf '  \033[33mskip\033[0m shellcheck not installed (brew install shellcheck)\n'
fi

head "Xcode project"

for plist in ios/App/App/Info.plist ios/App/App/PrivacyInfo.xcprivacy ios/App/App.xcodeproj/project.pbxproj; do
  plutil -lint "$plist" >/dev/null 2>&1 \
    && pass "$(basename "$plist") is well formed" \
    || fail "$plist is malformed"
done

# The privacy manifest only ships if it is in the Resources build phase.
plutil -convert json -o /tmp/_pbx.json ios/App/App.xcodeproj/project.pbxproj 2>/dev/null
node -e '
  const o=require("/tmp/_pbx.json").objects;
  const ref=Object.entries(o).find(([,v])=>v.isa==="PBXFileReference"&&v.path==="PrivacyInfo.xcprivacy");
  if(!ref) { console.error("no PBXFileReference"); process.exit(1); }
  const bf=Object.entries(o).find(([,v])=>v.isa==="PBXBuildFile"&&v.fileRef===ref[0]);
  if(!bf) { console.error("not a PBXBuildFile"); process.exit(1); }
  const inRes=Object.values(o).some(v=>v.isa==="PBXResourcesBuildPhase"&&(v.files||[]).includes(bf[0]));
  if(!inRes) { console.error("not in Resources build phase"); process.exit(1); }
' 2>/dev/null \
  && pass "PrivacyInfo.xcprivacy is in the Resources build phase" \
  || fail "PrivacyInfo.xcprivacy will not ship (not wired into the target)"

head "EAS project resolution"

# Mirrors @expo/config-plugins: findSchemePaths() globs only one level deep,
# while getAllPBXProjectPaths() filters on existsSync. The ios/App.xcodeproj
# shim satisfies the first without tripping the "multiple project.pbxproj"
# warning in the second.
EASROOT="$(npm root -g 2>/dev/null)/eas-cli"
if [ -d "$EASROOT/node_modules/glob" ]; then
  node -e '
    const {globSync}=require(process.argv[1]+"/node_modules/glob");
    const path=require("path"), fs=require("fs"), root=process.cwd();
    const schemes=globSync("ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme",{cwd:root});
    const projs=globSync("ios/**/*.xcodeproj",{cwd:root}).map(p=>p.replace(/^\//,""));
    const pbx=projs.map(v=>path.join(root,v,"project.pbxproj")).filter(v=>fs.existsSync(v));
    const names=schemes.map(p=>path.parse(p).name);
    if(!names.includes("App")) { console.error("scheme App not discoverable: "+JSON.stringify(names)); process.exit(1); }
    if(pbx.length!==1) { console.error("expected exactly 1 project.pbxproj, got "+pbx.length); process.exit(1); }
  ' "$EASROOT" 2>/dev/null \
    && pass "scheme 'App' resolves and exactly one project.pbxproj is found" \
    || { fail "EAS would fail to resolve the project"; node -e '
      const {globSync}=require(process.argv[1]+"/node_modules/glob");
      const path=require("path"), fs=require("fs"), root=process.cwd();
      console.log("       schemes:", globSync("ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme",{cwd:root}));
      const projs=globSync("ios/**/*.xcodeproj",{cwd:root}).map(p=>p.replace(/^\//,""));
      console.log("       pbxproj:", projs.map(v=>path.join(root,v,"project.pbxproj")).filter(v=>fs.existsSync(v)));
    ' "$EASROOT"; }
else
  printf '  \033[33mskip\033[0m eas-cli not installed globally\n'
fi

head "Archive script dry run"

DRY_RUN=1 bash scripts/eas/archive-ios.sh >/tmp/_dry.log 2>&1 \
  && { pass "archive-ios.sh dry run succeeded"; sed 's/^/       /' /tmp/_dry.log; } \
  || { fail "archive-ios.sh dry run failed"; sed 's/^/       /' /tmp/_dry.log; }

if [ "$FAILED" -eq 0 ]; then
  printf '\n\033[32mAll iOS build preflight checks passed.\033[0m\n'
else
  printf '\n\033[31mPreflight failed - fix the above before running eas build.\033[0m\n'
fi
exit "$FAILED"
