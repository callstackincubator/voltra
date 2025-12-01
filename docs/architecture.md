High-level: JSX → JSON → SwiftUI (Live Activities and Widgets)

- You author UI using our JSX primitives like `VStack`, `HStack`, `Text`, etc. in `src/jsx/Primitives.tsx`.
- We convert that JSX to VoltraUI JSON in `src/ReactToDynamicJSON.ts`.
- The iOS extension renders that JSON via the vendored Swift VoltraUI package under `ios-files/VoltraUI-main`, where `View.modifiers.swift` applies ordered modifiers when present, with a fallback to the legacy dictionary.

What a “modifier” is in this system

- Canonical (preferred): an ordered array on each component: `orderedModifiers: [{ name, args }]`.
- Legacy (kept for migration): a dictionary on each component: `modifiers: { ... }`.
- In React, you can pass an explicit `modifiers?: JSONModifier[]` prop on any primitive to control ordering and allow duplicates. RN-style props still map to a minimal, explicit subset.
- Advanced: You can also pass `style.modifiers` (array or object). We normalize it into `orderedModifiers` and keep a minimal legacy dictionary for compatibility.

JS → JSON mapping details

- Source: `src/ReactToDynamicJSON.ts`
- We flatten `props.style` (arrays supported), then build:
  - `orderedModifiers`: derived from RN-style props and/or the explicit `modifiers` prop
  - a minimal legacy `modifiers` dictionary for compatibility
- RN-style to canonical mapping (subset):
  - `style.color` → `{ name: 'foregroundStyle', args: { color } }`
  - `style.backgroundColor` → `{ name: 'backgroundStyle', args: { color } }`
  - `style.opacity` → `{ name: 'opacity', args: { value } }`
  - `style.fontWeight` → `{ name: 'fontWeight', args: { weight } }`
  - `style.fontStyle: 'italic'` → `{ name: 'italic', args: { enabled: true } }`
  - `style.padding` (number) → `{ name: 'padding', args: { all } }`
  - `style.fontSize` → `{ name: 'font', args: { size } }`
  - `style.width`/`style.height` (numbers) → `{ name: 'frame', args: { width?, height? } }`
  - `style.borderRadius` → `{ name: 'cornerRadius', args: { radius } }`
- Legacy dictionary retains a minimal reflection (e.g., `frame: { width?, height? }`, `cornerRadius`, …) for migration.
- Unsupported RN styles (e.g., `gap`, percent widths/heights, flexbox layout props) are ignored in native rendering and log dev warnings in development.

Swift side: which modifiers actually apply

- Source: `ios-files/VoltraUI-main/Sources/VoltraUI/Extensions/View.modifiers.swift`
- The iOS code prefers `orderedModifiers` and applies a curated set, falling back to the legacy dictionary when absent:
  - `frame { width?, height? }` → `.frame(width:height:)`
  - `foregroundStyle { color }` → `.foregroundStyle(...)`
  - `backgroundStyle { color }` → `.background(...)`
  - `fontWeight { weight }` → `.fontWeight(...)`
  - `italic { enabled? }` → `.italic()`
  - `font { size, weight? }` → `.font(.system(size:weight:))`
  - `padding { all }` → `.padding(...)`
  - `opacity { value }` → `.opacity(...)`
  - `cornerRadius { radius }` → `.cornerRadius(...)`
- Views now call `.voltraUIModifiers(component)` so ordered application is the default when present.

So, do we support “all SwiftUI modifiers automatically”?

- No. We support a curated subset implemented in `View.modifiers.swift`. Unknown keys are ignored.
- RN style props are not magically supported; only the ones we explicitly map (see `buildOrderedModifiers` and `extractModifiers` in `src/ReactToDynamicJSON.ts`).
- This is by design to keep payloads small and predictable for Live Activities.

What to tell other developers

- Use our JSX primitives (not `View/Text` from RN). Prefer the `modifiers` array for styling where order matters.
- It’s not “write any SwiftUI modifier and it will convert.” It’s “a small, documented subset of styling is supported; we can add more as needed.”
- RN-style props are a convenience; unknown styles are ignored with dev warnings.
- For advanced control, you can pass raw modifier keys via `style.modifiers` (array or object), but they will only have effect if the Swift side implements that key.

Current component and variant support

- JSX primitives are in `src/jsx/Primitives.tsx`: containers (`VStack`, `HStack`, `ZStack`, `ScrollView`, `List`, `NavigationView`, `Form`, `GroupBox`, `DisclosureGroup`, `HSplitView`, `VSplitView`, `Picker`) and leaves (`Text`, `Label`, `Image`, `Button`, `Toggle`, `Slider`, `Spacer`).
- The Swift library has more views (e.g., `Divider`, `ProgressView`, `Gauge`, etc.), but if a JSX primitive doesn’t exist yet, you can’t author it via JSX until we add it.
- Dynamic Island variants are supported. JSON selection and fallbacks happen in `ios-files/VoltraUIWidget.swift` (Live Activity / Dynamic Island), and lock screen selection for the static widget happens in `ios-files/VoltraUIStaticWidget.swift`:
  - Live Activity/Dynamic Island:
    - Lock screen falls back to `island.expanded` if missing.
    - Compact/minimal fall back minimal → compact → expanded → lockScreen.
    - Expanded per-side regions (leading/trailing/bottom) are only used if provided in the simplified schema; otherwise empty.
  - Static Widget (home screen):
    - Selects `lockScreen` if provided; otherwise falls back to `island.expanded`, then `island.compact`, then `island.minimal`.

Why some of your styles don’t “take” in the Live Activity

- `fontSize` is now supported via the `font` modifier (`{ name: 'font', args: { size } }`).
- `%` widths/heights are not supported; use numeric `width`/`height` (mapped to `frame.width`/`frame.height`).
- Layout styles like `flexDirection`, `gap`, `justifyContent` are RN constructs and are not mapped. Use the right container (e.g., `HStack`), `padding`, and `Spacer` for layout instead.

How to add support for a new modifier (example: lineLimit)

1. Decide a canonical name and args (e.g., `lineLimit: { value: number }`).
2. TS: Add a mapping in `buildOrderedModifiers` (optional) and extend docs/types if needed.
3. iOS: Add a `case "lineLimit":` in `.voltraUIModifiers(_ component:)` to apply `.lineLimit(...)`.
4. Update docs and add a small example + test.

Practical tips for authoring Live Activities UI

- Use the containers (`VStack/HStack/ZStack`) for layout; don’t rely on RN flexbox props.
- For size, use numeric `width`/`height` only.
- Use `padding`, `opacity`, `cornerRadius`, `foregroundStyle`/`backgroundStyle`, `font` (`size`/`weight`), `italic`, `fontWeight`.
- Prefer shorter text and concise layouts; Live Activities have tight space and a 4 KB payload limit.

One-liner you can give others

- “Build with our JSX primitives and style using the `modifiers` array (preferred) or the documented RN-style subset. We convert to VoltraUI JSON (with ordered modifiers), and iOS applies a curated set in order. If you need a new modifier, we can add it to both the TypeScript mapper and Swift handler.”

Key references in this repo

- JSX primitives: `src/jsx/Primitives.tsx`
- JSX → JSON: `src/ReactToDynamicJSON.ts` (see `buildOrderedModifiers`, `extractModifiers`, and `elementToJSON`)
- JSON schema: `src/types/VoltraUIJson.ts`
- Variant normalization: `src/normalize.ts`
- iOS modifier application: `ios-files/VoltraUI-main/Sources/VoltraUI/Extensions/View.modifiers.swift` (`.voltraUIModifiers(_ component:)` prefers ordered)
- Example UIs: `example/screens/live-activities/Example1.tsx`, `example/screens/live-activities/Example2.tsx`
- Docs: `docs/building-voltraui.md` (Supported components/modifiers and examples)

If you want, I can propose a small PR to:

- Add `fontSize` support end-to-end.
- Add a `Divider` JSX primitive to match the Swift support.
- Update [Example1.tsx]

## Push architecture: tokens, push-to-start, App Groups

- Native module: `ios/VoltraUIModule.swift`
  - When `VoltraUI_EnablePushNotifications` (or `ExpoLiveActivity_EnablePushNotifications`) is true in Info.plist, new activities are started with `pushType: .token`.
  - Observes ActivityKit streams and emits JS events:
    - `onTokenReceived` for per-activity push tokens (server uses this to send updates).
    - `onPushToStartTokenReceived` (iOS 17.2+) for push-to-start token.
    - `onStateChange` for lifecycle updates; an immediate event is also emitted when an activity becomes `.active`.
  - For Widgets, the module writes JSON to the App Group and calls `WidgetCenter.shared.reloadAllTimelines()` whenever `useVoltraWidget` (or the manual `startVoltraUI(..., { target: 'widget' })` / `updateVoltraUI('widget', ...)` / `endVoltraUI('widget')`) pushes new data.
- JS listeners are exported from `src/index.ts`:
  - `addActivityTokenListener`, `addActivityPushToStartTokenListener`, `addActivityUpdatesListener`.
- Config plugin pieces:
  - `plugin/src/withPushNotifications.ts` sets `aps-environment` entitlement and adds the Info flags above.
  - `plugin/src/withWidgetExtensionEntitlements.ts` and `plugin/src/withConfig.ts` configure App Group entitlements for the extension and main app when `groupIdentifier` is provided.
  - `plugin/src/withPlist.ts` writes `AppGroupIdentifier` into the extension Info.plist and `VoltraUI_AppGroupIdentifier` into the main app Info.plist.

### App Groups for events and shared images

- Extension writes component/lifecycle diagnostics into a shared queue under the key `VoltraUI_EventsQueue` in `UserDefaults(suiteName: AppGroupIdentifier)` (both Live Activity and static widget emit here).
- App polls that queue on a background Task and emits `onVoltraUIEvent` to JS.
- Remote images: the app downloads and saves into the App Group container (keyed by `VoltraUI_AppGroupIdentifier`); the extension loads by filename using `AppGroupIdentifier`.

### APNs payload shape for VoltraUIAttributes

Headers (required):

```
apns-push-type: liveactivity
apns-topic: <your.bundle.id>.push-type.liveactivity
```

Attributes/content-state for this module:

- Attributes type: `VoltraUIAttributes`
- Content state: `{ uiJsonData: <base64-encoded UTF‑8 VoltraUI JSON> }`

Push-to-start (iOS 17.2+):

```json
{
  "aps": {
    "event": "start",
    "timestamp": 1754491435000,
    "attributes-type": "VoltraUIAttributes",
    "attributes": { "name": "VoltraUI" },
    "content-state": { "uiJsonData": "<base64-of-utf8-voltraui-json>" }
  }
}
```

Update (iOS 16.2+):

```json
{
  "aps": {
    "event": "update",
    "timestamp": 1754063621319,
    "content-state": { "uiJsonData": "<base64-of-utf8-voltraui-json>" }
  }
}
```

### ActivityKit payload budget and our strategy

- ActivityKit enforces a small payload limit (≈4 KB). Base64 increases size by ~33%.
- We implement guards in both JS (`src/index.ts`, `src/useVoltraUI.ts`) and native (`ios/VoltraUIModule.swift`).
  - If a payload is too large, we throw (JS and native). There is no automatic trimming or clamping.
  - The static widget path does not apply the ActivityKit budget (no base64), but you should still keep JSON concise.
