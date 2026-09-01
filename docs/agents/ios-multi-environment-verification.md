# Verifying multi-environment iOS apply on macOS

Automated tests and a Linux run against a real React Native project cover file
generation. What they cannot cover is the part Xcode does: expanding
`$(VOLTRA_APP_GROUP_IDENTIFIER)` at build time, signing the extension, and
embedding a widget whose bundle identifier is a child of the app's. Every check
here exists because it cannot be run anywhere else.

Run this on macOS with Xcode when changing how `voltra apply` writes iOS build
settings, entitlements, or the widget target.

Deliverable: the report described at the end — one row per check ID, with
evidence. Nothing is committed or pushed.

## Rules

- Work inside a scratch directory. Do not edit anything under the cloned
  repository, and do not commit or push from it.
- Never relax a pass criterion to make a check pass. A check that cannot be run
  is `NOT RUN` with the reason, never `PASS`.
- When a command fails, capture stdout and stderr verbatim, then continue with
  the checks that do not depend on it. Only C6–C8 depend on a successful build.
- Do not diagnose or fix product code. Report what you observed; the fix is
  written on Linux against a unit test.
- Target names below assume an app called `MultiEnvApp`, so the widget target is
  `MultiEnvAppLiveActivity`. Confirm with `xcodebuild -list -project` before
  asserting, and use the real names if they differ.

## Phase 1 — preconditions and CLI build

Record every version in the report.

```sh
sw_vers -productVersion; xcodebuild -version; ruby -v; pod --version; node -v; pnpm -v

mkdir -p ~/voltra-verify && cd ~/voltra-verify
git clone https://github.com/callstackincubator/voltra.git
cd voltra
git checkout <branch under test>
git rev-parse --short HEAD          # record this
pnpm install
pnpm build
pnpm --filter voltra test
export VOLTRA_REPO="$PWD"
```

**C0 — the branch builds and its own tests pass.**
Pass: `pnpm build` exits 0 and the test run reports `# fail 0`.
A failure here invalidates everything after it; stop and report.

## Phase 2 — create the app under test

```sh
cd ~/voltra-verify
npx @react-native-community/cli@latest init MultiEnvApp --skip-install
cd MultiEnvApp
npm install

# Install the packages just built, as tarballs: symlinked native modules and
# CocoaPods autolinking do not reliably agree.
for pkg in cli ios ios-client core; do
  npm pack "$VOLTRA_REPO/packages/$pkg" --pack-destination /tmp
done
npm install /tmp/voltra-*.tgz /tmp/use-voltra-*.tgz

cd ios && pod install && cd ..
export APP_ROOT="$PWD"
```

If `npm pack` produces names other than those globs, install the exact files it
printed. Record which install path was used.

## Phase 3 — give the app three environments

Scripted rather than done in Xcode, so the setup is reproducible.

```sh
gem install xcodeproj --user-install    # or use the copy CocoaPods ships

cat > /tmp/setup_envs.rb <<'RUBY'
require 'xcodeproj'

project = Xcodeproj::Project.open(ARGV[0])
app = project.targets.find { |t| t.product_type == 'com.apple.product-type.application' }
abort 'no application target' unless app

project.add_build_configuration('Staging', :release)
app.add_build_configuration('Staging', :release)

suffixes = { 'Debug' => '.dev', 'Staging' => '.staging', 'Release' => '' }

project.build_configurations.each do |config|
  config.build_settings['BUNDLE_SUFFIX'] = suffixes.fetch(config.name)
end

app.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.example.multienv$(BUNDLE_SUFFIX)'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = "MultiEnvApp/#{config.name}.entitlements"
end

project.save
puts app.build_configurations.map(&:name).sort.join(',')
RUBY

ruby /tmp/setup_envs.rb "$APP_ROOT/ios/MultiEnvApp.xcodeproj"   # expect: Debug,Release,Staging

for CONFIG in Debug Staging Release; do
  cat > "$APP_ROOT/ios/MultiEnvApp/$CONFIG.entitlements" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict></dict>
</plist>
PLIST
done
```

The app identifier is deliberately composed from a build setting defined at
project level. That is the shape that broke twice during development; a literal
identifier per configuration would not exercise it.

## Phase 4 — configure Voltra and apply

```sh
cat > "$APP_ROOT/voltra.config.js" <<'JS'
module.exports = {
  ios: {
    groupIdentifier: {
      Debug: 'group.com.example.multienv.dev',
      Staging: 'group.com.example.multienv.staging',
      Release: 'group.com.example.multienv',
    },
    widgets: [{ id: 'portfolio', displayName: 'Portfolio', description: 'Track holdings' }],
  },
}
JS

cd "$APP_ROOT"
git add -A && git commit -qm "before apply"
npx voltra apply --platform ios 2>&1 | tee /tmp/apply-1.log
cd ios && pod install && cd ..
git add -A && git commit -qm "after apply"
```

**C1 — apply succeeds without an unexpected warning.**
Pass: exit code 0, and `/tmp/apply-1.log` contains no warning about differing
app versions. Such a warning would mean the configurations disagree on
`CFBundleShortVersionString`, which this setup does not do.

## Phase 5 — static checks on build settings

No build required. These catch most of what could be wrong.

```sh
setting() {  # target, configuration, key
  xcodebuild -project "$APP_ROOT/ios/MultiEnvApp.xcodeproj" \
    -target "$1" -configuration "$2" -showBuildSettings 2>/dev/null \
    | sed -n "s/^ *$3 = //p"
}

for CONFIG in Debug Staging Release; do
  echo "== $CONFIG"
  echo "  app id:     $(setting MultiEnvApp "$CONFIG" PRODUCT_BUNDLE_IDENTIFIER)"
  echo "  widget id:  $(setting MultiEnvAppLiveActivity "$CONFIG" PRODUCT_BUNDLE_IDENTIFIER)"
  echo "  app group:  $(setting MultiEnvAppLiveActivity "$CONFIG" VOLTRA_APP_GROUP_IDENTIFIER)"
  echo "  app ents:   $(setting MultiEnvApp "$CONFIG" CODE_SIGN_ENTITLEMENTS)"
done
```

**C2 — the widget identifier is a child of the app's, per configuration.**
Pass: the widget id equals that configuration's app id plus
`.MultiEnvAppLiveActivity` — `com.example.multienv.dev.MultiEnvAppLiveActivity`
under Debug, `com.example.multienv.staging.…` under Staging,
`com.example.multienv.…` under Release. Three distinct values.
If all three are identical, the suffix was resolved once against the wrong
configuration. If `MultiEnvAppLiveActivity` appears twice, a target-scoped
setting was copied instead of resolved. Either way iOS refuses to install the
extension.

**C3 — the App Group setting resolves per configuration.**
Pass: `VOLTRA_APP_GROUP_IDENTIFIER` is non-empty on the widget target and
differs across the three configurations, matching the config file. Empty means
the setting was written somewhere the widget target does not inherit from.

**C4 — per-configuration entitlements files survive.**
Pass: each configuration's `CODE_SIGN_ENTITLEMENTS` still points at its own file
(`MultiEnvApp/Debug.entitlements` and so on), and each of the three files
contains `com.apple.security.application-groups`. One path repeated across
configurations means apply flattened them.

**C5 — the files reference the setting rather than a baked value.**
Pass: `grep -r 'VOLTRA_APP_GROUP_IDENTIFIER' ios/MultiEnvApp/*.entitlements ios/MultiEnvApp/Info.plist`
finds the literal `$(VOLTRA_APP_GROUP_IDENTIFIER)`, and no literal
`group.com.example.multienv` appears in those files. A baked literal would give
every configuration the same group.

## Phase 6 — build checks, what only Xcode can answer

```sh
for CONFIG in Debug Staging; do
  xcodebuild -workspace "$APP_ROOT/ios/MultiEnvApp.xcworkspace" -scheme MultiEnvApp \
    -configuration "$CONFIG" -sdk iphonesimulator \
    -derivedDataPath "/tmp/dd-$CONFIG" build 2>&1 | tail -5
done

inspect() {  # configuration
  local APP="/tmp/dd-$1/Build/Products/$1-iphonesimulator/MultiEnvApp.app"
  local EXT="$APP/PlugIns/MultiEnvAppLiveActivity.appex"
  echo "== $1"
  echo "  app group (app): $(plutil -extract Voltra_AppGroupIdentifier raw "$APP/Info.plist")"
  echo "  app group (ext): $(plutil -extract Voltra_AppGroupIdentifier raw "$EXT/Info.plist")"
  echo "  ext id:          $(plutil -extract CFBundleIdentifier raw "$EXT/Info.plist")"
  codesign -d --entitlements :- "$EXT" 2>/dev/null | grep -A 2 application-groups
}
inspect Debug
inspect Staging
```

**C6 — Xcode expands the reference in Info.plist.**
Pass: both plists report `group.com.example.multienv.dev` for the Debug build —
a real group, never the literal `$(VOLTRA_APP_GROUP_IDENTIFIER)` and never
empty. This is the single assumption the whole design rests on. If it fails, the
approach is wrong rather than the implementation, and the report should say so
prominently.

**C7 — Xcode expands the reference in the entitlements.**
Pass: the extension's entitlements list the expanded group under
`com.apple.security.application-groups`. Info.plist expansion alone is not
enough — the entitlement is what grants the shared container at runtime.

If `codesign -d` prints nothing, the build was unsigned. Fall back to the
intermediate entitlements and record which source was read:

```sh
plutil -p /tmp/dd-Debug/Build/Intermediates.noindex/MultiEnvApp.build/Debug-iphonesimulator/MultiEnvAppLiveActivity.build/*.xcent
```

If neither exists, C7 is `NOT RUN`.

**C8 — the Staging build differs throughout.**
Pass: the same three values for Staging are the staging ones, and the extension
identifier is `com.example.multienv.staging.MultiEnvAppLiveActivity`. One
environment being right proves nothing; two differing ones prove the
per-configuration wiring.

## Phase 7 — mutation checks

```sh
cd "$APP_ROOT"
npx voltra apply --platform ios > /tmp/apply-2.log 2>&1
git diff --stat -- ios/                        # C9

# Add a fourth environment the way a team would, after the widget already exists.
ruby -e '
require "xcodeproj"
project = Xcodeproj::Project.open(ARGV[0])
app = project.targets.find { |t| t.product_type == "com.apple.product-type.application" }
project.add_build_configuration("Preview", :release)
app.add_build_configuration("Preview", :release)
project.build_configurations.find { |c| c.name == "Preview" }.build_settings["BUNDLE_SUFFIX"] = ".preview"
config = app.build_configurations.find { |c| c.name == "Preview" }
config.build_settings["PRODUCT_BUNDLE_IDENTIFIER"] = "com.example.multienv$(BUNDLE_SUFFIX)"
config.build_settings["CODE_SIGN_ENTITLEMENTS"] = "MultiEnvApp/Preview.entitlements"
project.save
' "$APP_ROOT/ios/MultiEnvApp.xcodeproj"
cp ios/MultiEnvApp/Release.entitlements ios/MultiEnvApp/Preview.entitlements

# Add Preview: 'group.com.example.multienv.preview' to voltra.config.js, then:
npx voltra apply --platform ios > /tmp/apply-3.log 2>&1   # C10

# Finally, replace the whole map with a single string and apply again.
npx voltra apply --platform ios > /tmp/apply-4.log 2>&1
grep -c VOLTRA_APP_GROUP_IDENTIFIER ios/MultiEnvApp.xcodeproj/project.pbxproj   # C11
```

**C9 — re-applying changes nothing.**
Pass: `git diff -- ios/` is empty after the second apply. Apply prints
`Updated project.pbxproj` even when the file is identical; that quirk exists on
`main` too and is not a failure. Judge this check by the diff alone.

**C10 — a later environment reaches the widget.**
Pass: `setting MultiEnvAppLiveActivity Preview PRODUCT_BUNDLE_IDENTIFIER`
returns `com.example.multienv.preview.MultiEnvAppLiveActivity` and the app group
setting returns the preview group. An empty result means the widget target never
gained the configuration, so building that scheme embeds an unconfigured
extension.

**C11 — going back to a single string cleans up.**
Pass: the `grep -c` returns 0, and the entitlements now contain the literal group
instead of a reference. Leftover settings would keep overriding the files.

## Phase 8 — single-environment regression pass

Most users are not multi-environment, and the last regression found showed up
only here.

```sh
cd ~/voltra-verify
npx @react-native-community/cli@latest init PlainApp --skip-install
cd PlainApp && npm install && npm install /tmp/voltra-*.tgz /tmp/use-voltra-*.tgz
printf "module.exports = { ios: { groupIdentifier: 'group.com.example.plain', widgets: [{ id: 'p', displayName: 'P', description: 'D' }] } }\n" > voltra.config.js
npx voltra apply --platform ios && (cd ios && pod install)

xcodebuild -project ios/PlainApp.xcodeproj -target PlainAppLiveActivity \
  -configuration Debug -showBuildSettings 2>/dev/null | sed -n 's/^ *PRODUCT_BUNDLE_IDENTIFIER = //p'
grep -c VOLTRA_ ios/PlainApp.xcodeproj/project.pbxproj
```

**C12 — the stock template is untouched by the new machinery.**
Pass: the widget identifier is
`org.reactjs.native.example.PlainApp.PlainAppLiveActivity` — the app's
identifier plus the target name, with `PlainAppLiveActivity` appearing exactly
once — and the `VOLTRA_` grep returns 0. The template's identifier is
`org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)`; copying that
verbatim into the widget names it after itself, which broke every stock project
during development.

**C13 — the stock app builds and runs.**
Pass: `xcodebuild -workspace ios/PlainApp.xcworkspace -scheme PlainApp -sdk iphonesimulator build`
succeeds, and `xcrun simctl install` then `launch` of the product does not crash.

## Out of scope

Report these as `NOT RUN` rather than attempting them: adding a widget from the
iOS widget gallery, which is not scriptable; and device signing with a real
Apple Developer team, unless one is configured on the machine — if it is,
archive the Release scheme and report whether signing succeeded for both the app
and the extension.

## Report

Produce exactly this, and nothing that softens it.

| Field       | Content                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| environment | macOS, Xcode, Ruby, CocoaPods, Node, pnpm versions; repo commit SHA                                             |
| results     | One row per check C0–C13: `PASS`, `FAIL`, or `NOT RUN` with the reason                                          |
| evidence    | For every check, the command's actual output, quoted. For a PASS, the values observed — not the word "expected" |
| failures    | For each FAIL, the full command, its output, and the four `-showBuildSettings` values for every configuration   |
| deviations  | Any command changed and why — a different install path, adjusted target names, a fallback for entitlements      |

C2, C6 and C12 are the ones worth reading first: a failure in any of them means
a widget that does not install or does not share data, which is the entire point
of the change.
