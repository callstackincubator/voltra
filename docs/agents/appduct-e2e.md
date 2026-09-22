# Driving the example app with Appduct

[Appduct](https://github.com/callstackincubator/appduct) lets an agent call functions inside the
running example app. The app registers tools; the `appduct` CLI or MCP server invokes them over a
pinned local connection. For Voltra that removes the slowest part of an end-to-end pass: putting a
widget, a Live Activity, or an ongoing notification into a known state no longer means tapping
through the tab bar and the launcher, and reading back what is actually live no longer means
squinting at a screenshot.

Appduct drives the app. It does not look at the screen — pair it with `agent-device` (or
`xcrun simctl io screenshot` / `adb exec-out screencap`) when a step has to be verified visually.

The tools live in `example/appduct/`, registered per platform:

| File                                     | Registers                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `example/appduct/AppductTools.tsx`       | Picks the platform's tool set. Mounted once in `example/app/_layout.tsx`. |
| `example/appduct/IosVoltraTools.tsx`     | The `voltra/ios` group                                                    |
| `example/appduct/AndroidVoltraTools.tsx` | The `voltra/android` group                                                |
| `example/appduct/shared.ts`              | Schemas both platforms describe their inputs with                         |

iOS and Android get different tools on purpose. Android addresses placements by `appWidgetId` and
can ask the launcher to pin a widget; iOS addresses widgets by family and has no runtime
configuration API at all. The Android counterpart of a Live Activity is an ongoing notification,
driven by a serializable payload. The hooks for each platform therefore live in a component only
that platform renders, so `appduct tools` lists exactly what the connected device can serve.

## Connect

You need a development build — Appduct ships no native module in release builds, which leaves
every registration below inert. Metro must be running, and the app installed on the device or
simulator you are driving.

```bash
npm install -g appduct            # once, on this machine

cd example
appduct link --open android --device emulator-5554   # or: --open ios-sim
appduct ls                                           # confirm the session is active
```

`link` reads the deep-link scheme (`voltra`) out of `example/app.json`, so it needs no `--scheme`
when run from `example/`. `--open` delivers the link through `adb`/`simctl` — no QR scanning.
Sessions survive Metro reloads and backgrounding, so one `link` normally covers a whole run.

For an MCP client (Claude Code, Cursor) instead of the CLI:

```json
{ "mcpServers": { "appduct": { "command": "appduct", "args": ["mcp"] } } }
```

The tools then arrive as `appduct_list_tools`, `appduct_describe_tool`, and `appduct_call_tool`.

## Look before you invoke

```bash
appduct tools --groups                 # voltra/ios or voltra/android, with counts
appduct tools --group voltra/android   # the connected platform's tools
appduct tools ios_update_dynamic_widget   # one tool's full input/output schema
appduct invoke android_list_widgets
appduct invoke ios_update_dynamic_widget --input '{"widgetId":"ClientRenderedDemoWidget","props":{"city":"Paris"}}'
```

Only one platform's group is ever present: if `--groups` shows `voltra/ios`, you are connected to
a simulator or an iPhone, and the `android_*` tools do not exist in that session.

## iOS tools (`voltra/ios`)

| Tool                                 | What it does                                          |
| ------------------------------------ | ----------------------------------------------------- |
| `ios_open_screen`                    | Navigate to an example-app screen by route            |
| `ios_list_widgets`                   | Placed widgets and the family each uses               |
| `ios_reload_widgets`                 | Ask WidgetKit to re-render                            |
| `ios_update_dynamic_widget`          | Replace a Dynamic Widget's props                      |
| `ios_clear_widgets`                  | Drop stored payloads, one widget or all               |
| `ios_set_widget_server_update`       | Point a server-driven widget at another endpoint      |
| `ios_get_widget_server_update`       | Read back what a widget would fetch with right now    |
| `ios_clear_widget_server_update`     | Fall back to `app.json`                               |
| `ios_list_live_activity_definitions` | Dynamic Live Activity ids bundled in this build       |
| `ios_start_live_activity`            | Start one, returns the activity name to address it by |
| `ios_update_live_activity`           | Replace its props                                     |
| `ios_stop_live_activity`             | End one                                               |
| `ios_live_activity_status`           | Whether an activity is running                        |
| `ios_preload_images`                 | Preload images for widgets and Live Activities        |
| `ios_clear_preloaded_images`         | Drop them again                                       |
| `ios_read_events`                    | Voltra events the app received, since the last read   |
| `ios_reset`                          | Clean slate between test cases                        |

## Android tools (`voltra/android`)

| Tool                                          | What it does                                               |
| --------------------------------------------- | ---------------------------------------------------------- |
| `android_open_screen`                         | Navigate to an example-app screen by route                 |
| `android_list_widgets`                        | Placements, each with its `appWidgetId`                    |
| `android_request_pin_widget`                  | Show the system "Add widget" dialog for one widget         |
| `android_reload_widgets`                      | Re-render placed widgets                                   |
| `android_update_dynamic_widget`               | Replace a Dynamic Widget's props                           |
| `android_clear_widgets`                       | Drop stored payloads, one widget or all                    |
| `android_get_widget_configuration`            | Read `env.configuration`, per widget type or per placement |
| `android_set_widget_configuration`            | Write it — the stand-in for the system Edit Widget dialog  |
| `android_clear_widget_instance_configuration` | Drop one placement's own values                            |
| `android_set_widget_server_update`            | Point a server-driven widget at another endpoint           |
| `android_get_widget_server_update`            | Read back what a widget would fetch with right now         |
| `android_clear_widget_server_update`          | Fall back to `app.json`                                    |
| `android_notification_permission`             | Check, and optionally request, the notification permission |
| `android_start_ongoing_notification`          | Post one from a payload                                    |
| `android_update_ongoing_notification`         | Replace its content                                        |
| `android_stop_ongoing_notification`           | Dismiss it                                                 |
| `android_ongoing_notification_status`         | Live/dismissed/promoted, plus device capabilities          |
| `android_reset`                               | Clean slate between test cases                             |

## Recipes

**Put a widget into a known state and screenshot it.**

```bash
appduct invoke android_update_dynamic_widget \
  --input '{"widgetId":"AndroidClientDemoWidget","props":{"city":"Paris","temperature":9}}'
adb exec-out screencap -p > /tmp/widget.png
```

**Give two placements different configurations (ADR 0007).** `android_list_widgets` reports each
`appWidgetId`; write per-placement values without touching the launcher:

```bash
appduct invoke android_list_widgets
appduct invoke android_set_widget_configuration --input '{"appWidgetId":42,"values":{"city":"Paris"}}'
appduct invoke android_set_widget_configuration --input '{"appWidgetId":43,"values":{"city":"Berlin"}}'
appduct invoke android_reload_widgets --input '{"widgetIds":["AndroidClientDemoWidget"]}'
```

There is no iOS equivalent: a placement's configuration only changes through the system Edit
Widget sheet. Drive that with `agent-device`, and use `ios_update_dynamic_widget` for everything
that does not specifically test configuration.

**Assert that a Home Screen tap reached the app.** Voltra interactions arrive asynchronously, long
after the tool call that set the surface up. `ios_read_events` drains what arrived since the last
read, so an assertion is not a race:

```bash
appduct invoke ios_read_events --input '{"drain":true}'   # clear the buffer
# ... tap the widget button with agent-device ...
appduct invoke ios_read_events --input '{"kind":"interaction"}'
```

The same events are pushed onto Appduct's own event stream, so `appduct events` follows them live.

**Point a widget at the fake server.** `example/server/widget-server.tsx` (port 3333) serves the
per-instance fetch demo:

```bash
appduct invoke android_set_widget_server_update \
  --input '{"widgetId":"AndroidClientDemoWidget","settings":{"url":"http://10.0.2.2:3333","intervalMinutes":15}}'
appduct invoke android_get_widget_server_update --input '{"widgetId":"AndroidClientDemoWidget"}'
```

Use `http://localhost:3333` on the iOS simulator. Plain `http` is accepted only in a debug build,
and only for a local dev host.

**Reset between cases.** `ios_reset` / `android_reset` end every Live Activity or ongoing
notification, clear widget payloads, and drop runtime server-update overrides. They do not remove
placements — that still needs the launcher.

## Gotchas

- A release build carries no native Appduct module. The registrations stay inert and `connect()`
  rejects with `appduct_disabled`; this is the intended behavior, not a setup failure.
- A tool call gets 10 seconds unless its registration declares `timeoutMs`. `ios_preload_images`
  declares 30 seconds because it downloads.
- Android needs at least one placement before the widget tools do anything visible.
  `android_request_pin_widget` opens the system dialog; a human or `agent-device` still confirms it.
- Ongoing notifications need the notification permission on Android 13+, and promoted ongoing
  notifications need Android 16+. `android_ongoing_notification_status` reports both, which is how
  you tell a real failure from an unsupported API level.
- Fast Refresh re-registers tools, so a saved edit can briefly change what `appduct tools` lists.

## Adding a tool

Add the `useAppductTool` call to the platform component that already renders for that platform —
never to a shared one, and never behind an `if`. Gate a tool with `{ enabled }` instead, so the
rules of hooks still hold. Give every tool a `group`, a description whose first line says what it
does, an `outputSchema`, and `annotations` (`readOnlyHint`, `destructiveHint`) — an agent picks a
tool from that one signature line. Then update the table above.
