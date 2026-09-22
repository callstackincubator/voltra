# Per-instance server fetches — E2E proof (ADR 0007)

This directory contains a minimal, reproducible way to prove per-instance server fetches
end-to-end: two placements of the same Dynamic Widget, each with its own `city`, fetching
different data from the same fake server.

> Much of the driving below — reading placements, writing each one's `city`, reloading widgets —
> is now available as Appduct tools the app registers for the connected platform, callable from
> the terminal or an MCP client. See [`docs/agents/appduct-e2e.md`](../../docs/agents/appduct-e2e.md).
> `agent-device` is still what drives the launcher and the system widget dialogs, and what takes
> the screenshots.

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

### iOS walkthrough (scenario C) — actually run, real result

iOS has no runtime configuration API — the only way to give a placement a non-default `city` is the
system Edit Widget sheet.

`agent-device`'s own device claim was contended by another concurrent session/worktree on this
machine for most of this run (`Error (DEVICE_IN_USE)` even right after `agent-device devices`
showed the simulator unclaimed — a race with another session polling the same device), so this
pass drove the simulator directly with `idb` (`idb ui tap/swipe/text`, `--udid <simulator-udid>`,
coordinates in **points**, i.e. the screenshot's pixel size divided by the device scale factor — a
raw screenshot-pixel coordinate silently no-ops) plus `xcrun simctl io screenshot` for verification:

1. `open -a Simulator` (see the launch-failure note above — this must be running), `idb ui button
HOME` to leave the app, then a long-press on empty Home Screen space
   (`idb ui tap --duration 2.0 <x> <y>`) to enter jiggle/edit mode.
2. Tap **Edit** (top-left pill) → **Add Widget** to open the widget gallery. The gallery's app list
   itself is accessibility-empty in this idb/simulator combination (matches the `agent-device
help ios-system-ui` documented "search-result rows fall back to unlabeled nodes" gap) — using
   its **Search Widgets** field to search "Voltra" (the app name; the widget's own display name
   "Client-Rendered Demo" is not indexed as it hasn't been placed before) works and returns a
   tappable, labeled result row.
3. The result opens a per-app widget carousel (9 pages/sizes for this app's widgets). Swiping
   through it lands on "Client-Rendered Demo" — and its **live preview already showed real
   `env.configuration.city: London` / `env.instance: facc2258`** (the trial render, per ADR 0007).
   Tapping **Add Widget** placed it on the Home Screen.
4. The placed widget immediately rendered **`server city: London`, `server temp: 33°`,
   `env.instance: facc2258`** — real server data, not "(no server data)". The server log has the
   matching line:
   ```
   [19:04:45] [ios] ClientRenderedDemoWidget instance=facc2258 configuration={"city":"London","label":"Hello"} → city=London
   ```
   `instance` and `city` match exactly what the widget displayed. Screenshot:
   `ios-widget-placed-final.png`.
5. **Still not achieved: driving the Edit Widget sheet to change `city`.** Two separate attempts,
   documented honestly:

   **Attempt 1 — `agent-device` (as requested).** Retried claiming the booted simulator by UDID
   repeatedly: 8 attempts at 8s intervals, then 2 more at 25s intervals (~10 attempts over ~2.5
   minutes total). Every single attempt returned the identical error:

   ```
   Error (DEVICE_IN_USE): Device is already in use by another workspace session.
   Hint: Use a different device selector, wait for the other workspace to close its session, or run agent-device devices to choose another target.
   ```

   despite `agent-device devices` showing the simulator as unclaimed immediately before each
   attempt, and `agent-device close` reporting `Error (SESSION_NOT_FOUND): No active session` for
   this session. No claim file for this simulator's UDID exists under
   `~/.agent-device/device-claims/`, so the contention is not visible in that registry — it may be
   a live `ios-runner` reservation from another concurrent session/daemon on this machine (two
   separate `agent-device` daemon processes were observed running, one global install and one from
   an unrelated project's local `node_modules`). The claim never freed in this run. 2. **Attempt 2 — `idb` (fallback, as used for placement above).** With the companion reconnected
   (`idb connect <udid>` — it had disconnected after being killed earlier), long-pressing the
   placed widget on the normal, non-edit Home Screen was tried at multiple durations: 0.5s (no
   effect), 0.7s, 0.9s, 1.0s, 1.2s, 2.0s, and 4.5s. Every duration at or above ~0.7s entered the
   whole-screen jiggle/edit mode directly (`Edit`/`Done` pills, "-" remove badges on every icon and
   the widget) — never a widget-specific context menu with "Edit Widget"/"Remove Widget". Once, a
   tap aimed at the widget body landed on its "-" remove badge instead and opened a "Remove
   'Voltra'?" system dialog, which was cancelled without removing anything. iOS's per-widget
   contextual menu simply did not appear for idb's synthetic touch in this simulator/iOS 18.0
   combination — this looks like an automation-tooling gap (idb's touch synthesis resolving
   straight to the legacy jiggle gesture recognizer rather than the contextual-menu recognizer),
   not a product gap.

   The ADR 0007 mechanism itself — per-instance `env.configuration`/`env.instance`, the request
   carrying `instance`/`configuration`, and the server answering per configuration — is still
   proven end to end on iOS by steps 3–4 above using the _default_ configuration. Exercising a
   `city` change through Edit Widget needs either `agent-device`'s device claim to actually free,
   or a different touch-synthesis path than idb's `ui tap`/`swipe` (e.g. driving the physical
   Simulator window via the macOS Accessibility APIs / System Events instead of CoreSimulator's
   synthetic touch injection).

## Resolved: the `PlatformConstants` launch failure was a stale/duplicate-Metro artifact, not this change

Earlier runs in this worktree hit a native launch failure:

```
[runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'PlatformConstants'
could not be found. Verify that a module by this name is registered in the native binary.
```

A dedicated Metro on port 9999 was tried first (ruling out a _wrong-bundle_ theory: the error
reproduced with zero requests ever reaching that Metro, so it wasn't about which bundle was served).
The actual fix came from two things together, once an unrelated project's Metro on the default port
8081 was stopped and this worktree's Metro was started on 8081 instead:

1. Rebuilding with the default port: `npx expo run:ios --device "iPhone 16 Pro"` from `example/`
   (its own install step still fails with a `devicectl`/"Install Application not supported" quirk
   caused by two simulators both named "iPhone 16 Pro" on this machine — install the built `.app`
   manually with `xcrun simctl install <udid> <path-to-.app>` when that happens).
2. Making sure the **Simulator.app GUI window itself is open** (`open -a Simulator`) before calling
   `xcrun simctl launch`. Launching headlessly, with no Simulator window, produced a generic
   `FBSOpenApplicationServiceErrorDomain code 4` failure independent of the app; opening the
   Simulator app window first fixed both that and the `PlatformConstants` crash immediately —
   the app launched clean and rendered `example/screens/PerInstanceServerFetchScreen.tsx`'s iOS
   section correctly on first try afterward (screenshot: `ios-port8081-check1.png`).

So the original failures were an artifact of this environment's Metro/simulator setup at the time
(a stray Metro on 8081 serving an unrelated project, compounded by driving `simctl` without the
Simulator app window open) rather than anything wrong with the ADR 0007 JS/app.json/server changes.

What was verified for iOS, on a real simulator, in the end (see the walkthrough above for the full
story): the app launches cleanly, `ClientRenderedDemoWidget` can be found and placed via the system
widget gallery, its trial render and its post-placement render both show real
`env.configuration.city` / `env.instance` values, and the server log has the matching
`instance`/`configuration` line for that exact request. The only gap is driving the Edit Widget
sheet to change `city` at runtime through automation — not exercised this run (see point 5 above).

## What "done" looks like

- Server log lines like:
  ```
  [14:32:10] [android] AndroidClientDemoWidget instance=3f9a2c1e configuration={"city":"London","label":"Hello"} → city=London
  [14:32:11] [android] AndroidClientDemoWidget instance=8b71d0aa configuration={"city":"Paris","label":"Hello"} → city=Paris
  [19:04:45] [ios] ClientRenderedDemoWidget instance=facc2258 configuration={"city":"London","label":"Hello"} → city=London
  ```
- Two Android Home Screen widgets showing different `server city:` / `server temp:` lines and
  different `env.instance:` values (verified: Paris/6° vs Berlin/9°, screenshot
  `android-home-widgets-v3.png`).
- Setting both Android placements to the same city collapses the log to one `instance` per fetch
  cycle (verified: both placements converge on `instance=48685edf`/Madrid/28°, screenshot
  `android-scenario-b-widgets.png`).
- An iOS Home Screen widget showing real `server city:`/`server temp:`/`env.instance:` values
  matching a server log line (verified: London/33°/`facc2258`, screenshot
  `ios-widget-placed-final.png`).

### iOS Edit Widget step: verified

Driven with the Claude Code iOS Simulator tool plus `idb` for key events (the `agent-device` claim stayed held by another session):

1. Long-press the placed widget (about 1 s) at its centre. This opens the widget's own context menu, not jiggle mode; shorter presses do nothing and `idb` long-presses fell into jiggle mode.
2. Tap **Edit Widget**, tap the **City** value (tapping the row label does nothing), clear it with `idb ui key 42` (backspace) and `idb ui key 76` (forward delete), then `idb ui text "Paris"`. Text tools that strip control characters cannot clear the field; two spaces become ". " through autocorrect.
3. Tap **Done**, tap outside the sheet, and wait a few seconds.

Result on iPhone 16 Pro (iOS 18.0): the widget re-rendered with `env.configuration.city: Paris`, `env.instance: 0ab4e6fb`, server city Paris and the server's temperature. The fake server logged:

```
[19:24:51] [ios] ClientRenderedDemoWidget instance=0ab4e6fb configuration={"city":"Paris","label":"Hello"} → city=Paris
```

The previous placement with the default configuration had `instance=facc2258`, so editing the configuration moved the placement to a new instance and a new fetch, as ADR 0007 specifies.
