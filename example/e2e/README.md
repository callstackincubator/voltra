# Per-instance server fetches — E2E proof (ADR 0007)

This directory contains a minimal, reproducible way to prove per-instance server fetches
end-to-end: two placements of the same Dynamic Widget, each with its own `city`, fetching
different data from the same fake server.

Widgets under test:

- Android: `AndroidClientDemoWidget` (`example/widgets/android/AndroidClientDemoWidget.tsx`)
- iOS: `ClientRenderedDemoWidget` (`example/widgets/ios/ClientRenderedDemoWidget.tsx`)

Both have `appIntent.parameters` with a `city` parameter (default `London`) and a `serverUpdate`
pointing at the fake server (`example/server/widget-server.tsx`, port `3333`). The server logs each
request's `instance` and `configuration` query parameters and returns
`{ city, temperature, instance }` derived from them.

## Prerequisites

From `example/`:

```bash
# Terminal 1 — fake server (logs instance/configuration per request)
pnpm widget:server 2>&1 | tee /tmp/widget-server-e2e.log

# Terminal 2 — Metro (see the worktree-Metro note below if bundles 500)
npx expo start --clear
```

If `app.json` changed since the last native build, re-run prebuild and rebuild the native apps
(see the top-level task instructions / AGENTS.md for the exact commands: `expo prebuild`, `pod
install`, `gradlew :app:assembleDebug` + `adb install`, or `xcodebuild` for the simulator).

### Worktree Metro note

In a git worktree, `node_modules/metro`, `metro-runtime`, `@expo/cli`, and `@babel/runtime` may
resolve to the main checkout instead of this worktree, which makes the widget bundle URL 500 and
widgets silently show stale prerendered state. Check:

```bash
ls -la node_modules/metro node_modules/metro-runtime node_modules/@expo/cli node_modules/@babel/runtime
```

If they are not symlinks into `node_modules/.pnpm` under this worktree, create them (see example in
git history of this change), then start Metro with `--clear` and curl the bundle URL until it
returns 200:

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:8081/voltra/widgets/AndroidClientDemoWidget.bundle?platform=android&dev=true'
```

If port 8081 is already taken by an unrelated project, run Metro on another port and forward it:

```bash
npx expo start --clear --port 8090
adb -s emulator-5554 reverse tcp:8081 tcp:8090
```

## Running the suite

```bash
cd example
SERVER_LOG_PATH=/tmp/widget-server-e2e.log ANDROID_SERIAL=emulator-5554 npx tsx e2e/per-instance-server-fetch.ts android
SERVER_LOG_PATH=/tmp/widget-server-e2e.log npx tsx e2e/per-instance-server-fetch.ts ios
```

The script shells out to the `agent-device` CLI and greps the server log for
`AndroidClientDemoWidget instance=<hash> configuration=<json>` / `ClientRenderedDemoWidget
instance=<hash> configuration=<json>` lines. It is deliberately thin — an interactive walkthrough,
not a black box — because pinning widgets and driving the system Add/Edit Widget dialogs needs
live, snapshot-driven `agent-device` steps whose exact refs depend on the current screen state.

### Android walkthrough (scenarios A and B)

1. Open the app: `agent-device open com.callstackincubator.voltraexample --platform android --serial emulator-5554`
2. The home screen (`example/screens/PerInstanceServerFetchScreen.tsx`) lists current
   `AndroidClientDemoWidget` placements read from `getActiveWidgets`. If there are none, tap
   **Request pin: AndroidClientDemoWidget** (`testID="request-pin"`) and accept the system "Add"
   dialog (use ref-based presses from a fresh `snapshot -i` — coordinate taps on the system dialog
   are unreliable). Repeat to pin a second placement.
3. For scenario A: set the two placements to different cities using each placement's
   `city-input-<appWidgetId>` field and `set-city-<appWidgetId>` button, then tap **Reload Android
   widgets** (`testID="reload-android-widgets"`). Check the Home Screen widgets show different
   `server city:` / `server temp:` lines, and check the server log for two distinct `instance`
   values sharing `AndroidClientDemoWidget` with different `configuration` payloads (different
   `city`).
4. For scenario B: set both placements to the _same_ city, reload, and check the server log shows
   only one `instance` value for that configuration — proving the fetch is coalesced per
   configuration, not per placement.
5. Removing a placement needs a long-press + drag to the Remove pill (`agent-device help
ios-system-ui` documents the analogous iOS flow; on Android use `longpress` on the widget then
   drag to the Remove target read from a fresh snapshot).

### iOS walkthrough (scenario C)

iOS has no runtime configuration API — the only way to give a placement a non-default `city` is the
system Edit Widget sheet.

1. `agent-device open com.apple.springboard --platform ios`, then `snapshot -i`, long-press an
   empty area to enter edit mode, and add "Client-Rendered Demo" (`ClientRenderedDemoWidget`)
   following `agent-device help ios-system-ui`.
2. Long-press the placed widget to reach Edit Widget, and attempt to change `city`. **What this
   run actually achieved**: see the results section below — if the Edit Widget sheet's dynamic
   `city` field could not be driven reliably through agent-device's current iOS system-UI support,
   this is documented honestly rather than claimed.
3. Regardless, confirm the placed widget renders `server city:` / `server temp:` (not
   "(no server data)") and a real `env.instance:` value, and that the server log has at least one
   `ClientRenderedDemoWidget instance=... configuration=...` line — proving the request carried the
   per-instance query parameters end to end even under default configuration.

## Known issue: iOS Debug builds may fail to launch in this environment

In the worktree this feature was developed in, even a fully clean iOS build (erased simulator,
wiped `~/Library/Developer/Xcode/DerivedData`, regenerated Codegen via `pod install`, rebuilt with
`npx expo run:ios`) failed at first launch with:

```
[runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'PlatformConstants'
could not be found. Verify that a module by this name is registered in the native binary.
```

**Ruled out: a Metro port conflict.** A plausible theory was that the app connected to a _different_
project's Metro already running on the default port 8081 (there was an unrelated `cordierite`
project bound to 8081 on this machine) and got served a mismatched bundle. This was retested
directly: Metro was started dedicated on port 9999
(`npx expo start --clear --port 9999` from `example/`), the widget bundle was confirmed served from
it (`curl -s -o /dev/null -w '%{http_code}\n'
"http://localhost:9999/voltra/widgets/ClientRenderedDemoWidget.bundle?platform=ios&dev=true"` → `200`),
and the app was rebuilt against that port (`npx expo run:ios --device "iPhone 16 Pro" --port 9999`,
manually `xcrun simctl install`/`launch`-ed after `expo run:ios`'s own install step failed with an
unrelated `devicectl`/"Install Application not supported" quirk caused by two same-named "iPhone 16
Pro" simulators on this machine). The same `PlatformConstants` error reproduced immediately, **and
Metro's own log shows zero incoming bundle requests from the app** — the crash happens during
native module registration, before the app ever asks Metro for a bundle. That rules out a bundle
mismatch/wrong-Metro theory conclusively: the failure is in the native binary's TurboModule
registry, not in what JS it was served. It reproduced across multiple from-scratch rebuilds
(including with a dedicated, verified-correct Metro instance) and is very likely a pre-existing
environment issue (possibly related to this repo's `React-Core-prebuilt` precompiled binary
distribution not matching the local Xcode/toolchain) rather than anything caused by this ADR 0007
change, which touches only JS/app.json/the fake server. Screenshot:
`ios-port9999-platformconstants-error.png`.

What _was_ verified for iOS given this blocker:

- The server-side request/response contract: `ClientRenderedDemoWidget` with a `city` in
  `configuration` returns the right per-instance payload and logs it correctly:
  ```
  curl -H "Authorization: Bearer demo-token" \
    "http://localhost:3333?widgetId=ClientRenderedDemoWidget&platform=ios&theme=light&locale=en-US&instance=ios-demo-1&configuration=%7B%22city%22%3A%22Tokyo%22%7D"
  # => {"city":"Tokyo","temperature":29,"instance":"ios-demo-1"}
  ```
- `example/widgets/ios/ClientRenderedDemoWidget.tsx` type-checks and renders the same
  `env.configuration.city` / `env.instance` / server city+temperature lines as the Android widget.
- iOS SpringBoard placement/Edit Widget driving via `agent-device help ios-system-ui` was not
  exercised on-device because the app itself could not reach a runnable state — this is the honest
  gap. Re-run this suite once the native runtime issue above is resolved.

## What "done" looks like

- Server log lines like:
  ```
  [14:32:10] [android] AndroidClientDemoWidget instance=3f9a2c1e configuration={"city":"London","label":"Hello"} → city=London
  [14:32:11] [android] AndroidClientDemoWidget instance=8b71d0aa configuration={"city":"Paris","label":"Hello"} → city=Paris
  ```
- Two Home Screen widgets showing different `server city:` / `server temp:` lines and different
  `env.instance:` values.
- Setting both placements to the same city collapses the log to one `instance` per fetch cycle.
