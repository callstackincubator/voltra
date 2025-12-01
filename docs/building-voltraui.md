# Building Voltra UIs

Voltra lets you author UI in React (JSX) and render it natively in SwiftUI contexts like Live Activities and Widgets. The library converts JSX to VoltraUI JSON under the hood and handles start/update/end.

This guide includes:

- Authoring UI with JSX primitives
- JSX → JSON normalization (optional: use helper directly)
- Supported components and modifiers (ordered modifiers)
- Lifecycle APIs (start, update, end, end-all)
- Presentation variants for Dynamic Island and Widgets
- Events
- Troubleshooting and best practices

Tip: The example app contains a gallery screen at `example/screens/CreateVoltraUIScreen.tsx` that you can run and tweak.

## Quickstart

1. Author your UI with the JSX primitives

```tsx
import {
  VStack,
  HStack,
  ZStack,
  Text,
  Label,
  Image,
  Button,
  Toggle,
  Slider,
  LinearGradient,
  SymbolView,
  useVoltraLiveActivity,
  useVoltraWidget,
} from 'voltra'

const ui = (
  <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
    <VStack identifier="root" style={{ padding: 16 }}>
      <Text style={{ fontWeight: '600', color: 'white' }}>Hello VoltraUI</Text>
      <SymbolView name="bolt.fill" type="hierarchical" scale="large" tintColor="#FFD700" />
      <Label title="Status" imageURL="bolt.fill" />
      <Button title="Tap Me" eventHandlerName="onPress" />
    </VStack>
  </LinearGradient>
)
```

2. Start a Live Activity or Widget (JSX input)

```tsx
const { start, update, end } = useVoltraLiveActivity(ui, {
  endAllBeforeStart: true,
  autoStart: false,
  autoUpdate: true,
})
// call start()/update()/end() from UI controls

// Static widgets: mount once and keep the JSON updated
useVoltraWidget(ui, { widgetKey: '1', autoUpdate: true })
```

3. Update later (hook auto-updates when JSX changes)

```tsx
// When your local state changes and the JSX re-renders, the hook will compute
// a new payload and push the update automatically if autoUpdate: true.
// Or manually trigger:
await update()
```

4. End

```tsx
await end()
// or end all running Live Activities created by this module
await endAllLiveActivities()
```

### Optional: JSON helper

If you want to inspect or store JSON, you can still use the helper directly:

```tsx
import { ReactToDynamicJSON, startVoltraUI } from 'voltra'
const json = ReactToDynamicJSON(ui)
const id = await startVoltraUI(json, { target: 'liveActivity' })
```

### Handling unsupported React Native components

By default, `ReactToDynamicJSON` skips JSX elements that do not map to a VoltraUI component. You can customize this behavior:

```ts
const json = ReactToDynamicJSON(ui, {
  // Keep unknown elements instead of dropping them.
  ignoreNonExistentElements: false,
  // Or replace them with a supported container.
  replaceNonExistentElementWith: 'VStack',
  // Surface diagnostics during development.
  unsupportedElementLogLevel: 'warn',
})
```

The same `reactToJsonOptions` object can be passed to `startVoltraUI`, `updateVoltraUI`, `normalizeVoltraUIInput`, and the `useVoltraUI` / `useVoltraLiveActivity` / `useVoltraWidget` hooks. This makes it straightforward to mix native React Native building blocks such as `Pressable` into your layouts while still emitting valid VoltraUI JSON.

## JSON shape and JSX mapping

VoltraUI expects a top-level array of components:

```ts
type VoltraUIJson = DynamicComponentJSON[]
```

Mapping rules:

- The root JSX element becomes the single element inside the top-level array.
- Containers with React children (`VStack`, `HStack`, `ZStack`, `ScrollView`, `List`, `Form`, `NavigationView`, `GroupBox`, `DisclosureGroup`, `HSplitView`, `VSplitView`, `Picker`) get a `children` array.
- `Text` can derive its `title` from a single string child: `<Text>hello</Text>`.
- Props like `identifier`, `title`, `imageURL`, `imageName`, `eventHandlerName` are copied to JSON when present.
- Event handler props map to `eventHandler`:
  - `eventHandlerName` wins if provided.
  - `onPress` → `eventHandler: 'onPress'`
  - `onToggle` → `eventHandler: 'onToggle'`
  - `onChange` (Slider) → `eventHandler: 'onChange'`
- Styles map to modifiers (see Modifiers below). You can also pass an explicit ordered `modifiers` array to control application order.

Example JSX → JSON:

```tsx
const ui = (
  <VStack identifier="root" style={{ padding: 16 }}>
    <Text style={{ color: '#4CAF50', fontWeight: '600', opacity: 0.7 }}>Styled</Text>
    <Button title="Tap" eventHandlerName="onPress" />
  </VStack>
)
```

```json
[
  {
    "type": "VStack",
    "identifier": "root",
    "modifiers": { "padding": 16 },
    "children": [
      {
        "type": "Text",
        "title": "Styled",
        "modifiers": { "foregroundStyle": "#4CAF50", "fontWeight": "600", "opacity": 0.7 }
      },
      { "type": "Button", "title": "Tap", "eventHandler": "onPress" }
    ]
  }
]
```

## Component catalog (current vendored support)

Swift source of truth: `ios-files/VoltraUI-main/Sources/VoltraUI/`

- Containers (support `children` and modifiers):
  - `VStack`, `HStack`, `ZStack`
  - `ScrollView`, `List`
  - `NavigationView`, `Form`, `GroupBox`, `DisclosureGroup`
  - `HSplitView`, `VSplitView`
  - `Picker`
  - `LinearGradient` — `{ type: 'LinearGradient', colors: string[], locations?: number[], start?: { x: number, y: number }, end?: { x: number, y: number }, dither?: boolean }`
    - Container that renders a gradient background behind its `children`. Supports custom start/end points, color stops, and dithering for smooth gradients.
  - Liquid Glass grouping (iOS 18+): `GlassContainer` (groups surfaces), `GlassView` (wraps content that receives `glassEffect`)
- Primitives:
  - `Text` — `{ type: 'Text', title: string }`
- `Image` — `{ type: 'Image', parameters?: { imageSourceKind, imageSourceValue }, imageURL?, imageName? }`
  - Supports React Native-style `source` props as well as `systemName` / `assetName`. The encoder stores the normalized source in `parameters.imageSourceKind` (`system`, `asset`, `uri`, `app-group`).
  - `SymbolView` — `{ type: 'SymbolView', name: string, type?: 'monochrome' | 'hierarchical' | 'palette' | 'multicolor', scale?: 'small' | 'medium' | 'large', weight?: 'ultraLight' | 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black', size?: number, tintColor?: string, colors?: string[], resizeMode?: 'scaleAspectFit' | 'scaleAspectFill' | 'scaleToFill', animationSpec?: object, fallback?: string }`
    - Native SF Symbols rendering with full API parity to expo-symbols. Supports hierarchical tinting, palette/multicolor symbols (up to three palette colors), animation specs, and honors either the `size` prop or the width/height you provide in `style`.
  - `Label` — `{ type: 'Label', title: string, imageURL?: string, imageName?: string }`
    - Uses `imageURL` as SF Symbol when provided.
  - `Divider` — `{ type: 'Divider' }`
  - `Spacer` — `{ type: 'Spacer' }`
- Inputs:
  - `Button` — `{ type: 'Button', title: string, eventHandler?: string }`
  - `Toggle` — `{ type: 'Toggle', title: string, identifier?: string, defaultValue?: boolean }`
    - Swift sets initial state from `defaultValue` and invokes callback on change.
  - `TextField`, `SecureField`, `TextEditor` — baseline rendering; exact prop surface may evolve.
  - `Slider` — `{ type: 'Slider', title?: string, minumum?: string, maximum?: string, defaultValue?: number }`
    - Note: JSON keys for labels are spelled `minumum` and `maximum` in the vendored package. The JSX helper maps `minLabel`/`maxLabel` into these keys for you.
  - `Gauge` — `{ type: 'Gauge', defaultValue?: number, parameters?: { startAtMs?: number, endAtMs?: number, showValueLabel?: boolean, hideValueLabel?: boolean } }`
    - Renders a percentage readout alongside the gauge by default. Disable it with `hideValueLabel={true}` or explicitly enable using `showValueLabel`.
  - `ProgressView` — `{ type: 'ProgressView', defaultValue?: number, maximumValue?: number, parameters?: { startAtMs?: number, endAtMs?: number, mode?: 'bar' | 'circular' } }`
  - `Timer` — `{ type: 'Timer', parameters?: { endAtMs?: number, startAtMs?: number, durationMs?: number, mode?: 'text' | 'circular' | 'bar', direction?: 'down' | 'up', autoHideOnEnd?: boolean } }`
    - Flexible countdown/stopwatch. JSX props map into `parameters` for forward-compatible growth.

Notes

- Most components support the common fields: `type`, `identifier`, `modifiers`.
- Some components (e.g., inputs) also use `defaultValue` to set initial state (bool/number depending on the control).

## Modifiers (style mapping)

Supported modifiers:

- `foregroundStyle: string` — color (e.g., `'red'`, `#RRGGBB` or `#RRGGBBAA`)
- `backgroundStyle: string`
- `fontWeight: '100' | '200' | ... | '900' | 'bold' | 'semibold' | ...`
- `padding: number` — a single uniform padding value
- `paddingHorizontal: number`
- `paddingVertical: number`
- `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`: `number`
- `margin`, `marginHorizontal`, `marginVertical`, `marginTop`, `marginBottom`, `marginLeft`, `marginRight`: `number` (all mapped to padding in SwiftUI)
- `opacity: number` — 0..1
- `font: { size: number, weight?: string }` — controls text size and optional weight
- `italic: { enabled?: boolean }` — shorthand for italic style
- `frame: { width?: number, height?: number }` — layout frame
- `cornerRadius: { radius: number }`
- `border: { width?: number, color?: string, cornerRadius?: number }`
- `shadow: { color?: string, opacity?: number, radius?: number, x?: number, y?: number }`
- `offset: { x?: number, y?: number }`
- `scaleEffect: { value?: number } | { x?: number, y?: number }`
- `rotationEffect: { degrees: number }`
- `multilineTextAlignment: { value: 'left' | 'center' | 'right' }`
- `lineSpacing: { value: number }`
- `kerning: { value: number }`
- `underline: { enabled?: boolean, color?: string }`
- `strikethrough: { enabled?: boolean, color?: string }`
- `clipped: { enabled?: boolean }` — maps to `overflow: 'hidden'` in RN-style props
- `glassEffect` (iOS 26+): `{ shape?: 'rect' | 'roundedRect' | 'capsule' | 'circle', cornerRadius?: number }`

### Liquid Glass (iOS 26+)

- `style.color` → `foregroundStyle`
- `style.backgroundColor` → `backgroundStyle`
- `style.opacity` → `opacity`
- `style.fontWeight` → `fontWeight`
- `style.padding*` (e.g., `padding`, `paddingHorizontal`, `paddingTop`) → `padding` modifier
- `style.margin*` (e.g., `margin`, `marginHorizontal`, `marginTop`) → `padding` modifier
- `style.fontSize` → `font.size`
- `style.width`/`style.height` (numbers) → `frame.width`/`frame.height`
- `style.borderRadius` → `cornerRadius.radius`
- `style.borderWidth`/`style.borderColor` → `border.width`/`border.color` (and `cornerRadius` if present)
- `style.shadowColor`/`shadowOpacity`/`shadowRadius`/`shadowOffset` → `shadow` args
- `style.elevation` (Android) → `shadow.radius`
- `style.textAlign` → `multilineTextAlignment`
- `style.numberOfLines` → `lineLimit`
- `style.lineHeight` → `lineSpacing`
- `style.letterSpacing` → `kerning`
- `style.textDecorationLine` → `underline` / `strikethrough`
- `style.transform` → `offset` (`translate[X|Y]`), `scaleEffect` (`scale`, `scaleX`, `scaleY`), `rotationEffect` (`rotate`)
- `style.overflow: 'hidden'` → `clipped`
- `style.position: 'absolute'` (+ `top`/`left`) → `offset`
- `style.tintColor` → `tint`
- `style.gaugeStyle` → `gaugeStyle`
- Unknown RN styles are ignored in native rendering and will log a dev warning.
- `width: '100%'` is supported and maps to `maxWidth: .infinity`.
- Percentage widths/heights are ignored; use numbers.

Tailwind-like helpers:

- `tint-<color>` → `style.tintColor`
- `gauge-<style>` → `style.gaugeStyle` (one of: accessoryCircular, accessoryLinear, linearCapacity, automatic)

Example:

```tsx
<Text modifiers={[{ name: 'font', args: { size: 16, weight: '600' } }]} style={{ color: '#4CAF50', opacity: 0.7 }}>
  Styled
</Text>
```

```json
[
  {
    "type": "Text",
    "title": "Styled",
    "orderedModifiers": [
      { "name": "font", "args": { "size": 16, "weight": "600" } },
      { "name": "foregroundStyle", "args": { "color": "#4CAF50" } },
      { "name": "opacity", "args": { "value": 0.7 } }
    ],
    "modifiers": { "foregroundStyle": "#4CAF50", "opacity": 0.7 }
  }
]
```

## Ordered modifiers primer

Why arrays? In SwiftUI, modifier order changes layout/appearance and duplicates are allowed. The canonical JSON now supports `orderedModifiers: [{ name, args }]` per node. We still ship a legacy `modifiers` dictionary for compatibility, but iOS prefers the ordered list when present.

Common names/args:

- `frame`: `{ width?: number, height?: number }`
- `padding`: `{ all: number }`
- `backgroundStyle`: `{ color: string }`
- `cornerRadius`: `{ radius: number }`
- `foregroundStyle`: `{ color: string }`
- `opacity`: `{ value: number }`
- `font`: `{ size: number, weight?: string }`
- `italic`: `{ enabled?: boolean }`
- `border`: `{ width?: number, color?: string, cornerRadius?: number }`
- `shadow`: `{ color?: string, opacity?: number, radius?: number, x?: number, y?: number }`
- `offset`: `{ x?: number, y?: number }`
- `scaleEffect`: `{ value?: number } | { x?: number, y?: number }`
- `rotationEffect`: `{ degrees: number }`
- `multilineTextAlignment`: `{ value: 'left' | 'center' | 'right' }`
- `lineLimit`: `{ value: number }`
- `lineSpacing`: `{ value: number }`
- `kerning`: `{ value: number }`
- `underline`: `{ enabled?: boolean, color?: string }`
- `strikethrough`: `{ enabled?: boolean, color?: string }`
- `clipped`: `{ enabled?: boolean }`
- `glassEffect` (iOS 18+): `{ shape?: 'rect' | 'roundedRect' | 'capsule' | 'circle', cornerRadius?: number }`

### Liquid Glass (iOS 18+)

Liquid Glass is Apple’s new dynamic material in SwiftUI 2025+. You can apply it with the ordered `glassEffect` modifier on devices running iOS 26+ and when building with the iOS 26 SDK.

```tsx
<VStack modifiers={[{ name: 'glassEffect', args: { shape: 'roundedRect', cornerRadius: 12 } }]} style={{ padding: 12 }}>
  <Text>Liquid Glass Card</Text>
  <Text style={{ opacity: 0.8 }}>Shimmering, lensing edges.</Text>
</VStack>
```

Notes:

- Build the app/extension with Xcode that includes the iOS 26 SDK. The symbol `.glassEffect` does not exist on older SDKs.
- At runtime the modifier runs only on iOS 26+ via availability checks; there is no blur fallback.

Dev warnings help you avoid unsupported RN styles (e.g., `gap`, `%` widths, flex layout props). Use stacks (`VStack`, `HStack`, `ZStack`) and supported modifiers for layout.

### Gradients (LinearGradient container)

`LinearGradient` is a container that draws a SwiftUI `LinearGradient` behind its children.

Props:

- `colors?: string[]` — array of color strings (named or hex: `#RRGGBB`, `#RRGGBBAA`)
- `stops?: Array<{ color: string; location: number }>` — gradient stops (0..1). When provided, `stops` take precedence over `colors`.
- `startPoint?: 'top' | 'bottom' | 'leading' | 'trailing' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | 'center'` — default `center`.
- `endPoint?: same as startPoint` — default `center`.

Like other containers, `LinearGradient` supports `style`, `className`/`tw`, and `modifiers` for padding, corner radius, frame, shadow, etc. These affect the container surface while the gradient fills it.

Examples:

```tsx
import { LinearGradient, VStack, Text } from 'voltra'
;<LinearGradient
  colors={['#0EA5E9', '#2563EB']}
  startPoint="topLeading"
  endPoint="bottomTrailing"
  style={{ padding: 12, borderRadius: 20 }}
>
  <VStack style={{ padding: 14, backgroundColor: '#FFFFFF', borderRadius: 16 }}>
    <Text style={{ fontWeight: '800', color: '#111827' }}>Gradient Card</Text>
  </VStack>
</LinearGradient>
```

With stops:

```tsx
<LinearGradient
  stops={[
    { color: '#f43f5e', location: 0 },
    { color: '#f59e0b', location: 0.5 },
    { color: '#10b981', location: 1 },
  ]}
  startPoint="leading"
  endPoint="trailing"
  style={{ padding: 12, borderRadius: 16 }}
>
  <Text style={{ color: '#fff', fontWeight: '700' }}>Hello, Gradient!</Text>
</LinearGradient>
```

#### Grouping and authoring with GlassContainer/GlassView (recommended)

Apple recommends grouping multiple glass surfaces so they render and morph as a single “liquid” mass. Use `GlassContainer` to define the group and `GlassView` to wrap elements that should receive a glass surface. Apply the ordered `glassEffect` modifier on `GlassView` and control spacing at the container.

```tsx
import { GlassContainer, GlassView, Text, HStack, VStack } from 'voltra'
;<GlassContainer spacing={10}>
  <GlassView
    style={{ padding: 12, borderRadius: 14 }}
    modifiers={[{ name: 'glassEffect', args: { shape: 'roundedRect', cornerRadius: 14 } }]}
  >
    <VStack>
      <Text style={{ fontWeight: '600' }}>Liquid Glass Card</Text>
      <Text style={{ opacity: 0.8 }}>Shimmering, lensing edges.</Text>
    </VStack>
  </GlassView>

  <GlassView style={{ borderRadius: 22 }} modifiers={[{ name: 'glassEffect', args: { shape: 'capsule' } }]}>
    <HStack>{/* controls/buttons */}</HStack>
  </GlassView>
</GlassContainer>
```

Guidance:

- `GlassContainer` optionally takes `spacing` to influence whether adjacent glass pieces merge visually.
- Put `glassEffect` late in the `orderedModifiers` for a `GlassView` so the effect targets the intended surface after size/shape.
- On iOS versions below 26, `GlassContainer` and `GlassView` render their children without Liquid Glass.

#### Rebuild requirement for Liquid Glass

Liquid Glass support lives in the native extension. JS hot reload does not update the extension. After adding `glassEffect`, you must rebuild the iOS app and extension with the iOS 26 SDK:

```bash
npx expo run:ios
```

Then End existing activities and Start again (use `endAllBeforeStart: true` during development).

#### Activity background with Glass

When a payload contains any `glassEffect`, the renderer defaults the Live Activity background tint to clear so the wallpaper shows through and glass can refract it. You can override by applying an explicit `backgroundStyle` on your root view if you want a solid card behind your glass content.

#### Renderer behavior (GlassView overlay)

`GlassView` draws the glass surface on a clear background and overlays its children, ensuring content stays visible above the glass effect. Apply color and text styles on the inner content, not as a solid background on the glass surface.

#### Troubleshooting Liquid Glass

- Black/empty surface with glass on iOS 26
  - Rebuild the app + extension with the iOS 26 SDK (JS reloads are insufficient).
  - End all activities and start fresh (`endAllBeforeStart: true`).
  - Long‑press the pill to expand; if expanded shows content, it was a background/tint issue rather than decode.
  - Add an event listener in the app to confirm `voltraui_onAppear` from the extension; check for `voltraui_decode_error` events if JSON is invalid.
  - Ensure your composition is `GlassContainer → GlassView (with glassEffect) → content` and that `glassEffect` comes after size/shape modifiers in `orderedModifiers`.

## Lifecycle APIs

- `startVoltraUI(ui, { target?: 'liveActivity' | 'widget', endAllBeforeStart?: boolean, deepLinkUrl?: string, widgetKey?: string, autoEndAt?: number, activityId?: string }) → Promise<string>`
  - Accepts JSX, JSON, or presentation variants (JSX or JSON).
  - `target: 'liveActivity'` starts a Live Activity (iOS 16.2+). `target: 'widget'` updates the static widget JSON via App Group storage (iOS 14+). The `useVoltraLiveActivity` / `useVoltraWidget` helpers set this for you.
  - `endAllBeforeStart` ends all running Live Activities before starting a new one (helps ensure the Dynamic Island shows the new content).
  - `autoEndAt` (epoch ms) best‑effort auto‑ends the Live Activity at the given time from the app process. For background‑reliable endings, use push.
  - `activityId` lets you assign a stable identifier for the native `ActivityAttributes` so multiple examples can run side-by-side without being grouped under a single "VoltraUI" pill. Use a unique value per Live Activity stream (e.g., a match id or delivery id). If `startVoltraUI` is invoked again with the same `activityId`, the existing Live Activity is updated in place instead of creating a duplicate.
- `updateVoltraUI(id, ui) → Promise<void>`
- `endVoltraUI(id) → Promise<void>`
- `endAllLiveActivities() → Promise<void>` — ends all running Live Activities created by this module

iOS requirements:

- Live Activities: iOS 16.2+ (ActivityKit)
- Widgets: iOS 14+ (WidgetKit StaticConfiguration). Note: the extension produced by this config plugin currently targets iOS 16.2 to support Live Activities in the same target.
- Use a Dev Client (not Expo Go)

## Presentation variants for Dynamic Island

Provide different JSX for minimal/compact/expanded layouts. The iOS widget selects region-specific JSON with sensible fallbacks.

```tsx
const variants = {
  lockScreen: (
    <VStack identifier="card" style={{ padding: 12 }}>
      <Text>Now Playing</Text>
    </VStack>
  ),
  island: {
    expanded: <Text>Center content</Text>,
    compact: <Image imageURL="music.note" />,
    minimal: <Image imageURL="music.note" />,
  },
}

const { start } = useVoltraLiveActivity(variants, { endAllBeforeStart: true })
```

Fallbacks:

- Lock screen defaults to `island.expanded` if omitted.
- Compact/minimal fall back to minimal → compact → expanded → lockScreen.
- Passing the same JSX element to multiple regions is payload-friendly. The normalizer deduplicates equal branches and relies on those fallbacks, so you only pay for the layout once in the JSON.

## Events

Subscribe in your app:

```tsx
import { addVoltraUIEventListener } from 'voltra'
import type { VoltraUIEvent } from 'voltra'

useEffect(() => {
  const sub = addVoltraUIEventListener?.((event: VoltraUIEvent) => {
    console.log('VoltraUI event:', event)
  })
  return () => sub?.remove?.()
}, [])
```

What you’ll see today:

- The extension emits lifecycle and diagnostic events (e.g., `voltraui_onAppear`, `voltraui_decode_error`) and minimal tap/change events (`voltraui_event`) with a `source` (`activity_content` or `dynamic_island`) and a `timestamp`.
- Component-level payloads (e.g., identifier, eventHandler, componentType) are evolving and may expand over time.

App Groups (optional but recommended): If you configure an App Group in the plugin, the extension writes events to a shared queue and the app polls and emits them to JS.

## Push notifications & background updates

Use push to start and update Live Activities when your app is backgrounded.

### 1) Enable in the config plugin

In your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "enablePushNotifications": true,
          "groupIdentifier": "group.your.app.voltraui"
        }
      ]
    ]
  }
}
```

What this does:

- Adds the `aps-environment` entitlement (dev default: `development`).
- Writes Info.plist flags enabling push integration (either of these will be read natively):
  - `VoltraUI_EnablePushNotifications: true`
  - `ExpoLiveActivity_EnablePushNotifications: true`
- Sets App Group entitlements for the extension and the main app when `groupIdentifier` is provided.
- Writes `VoltraUI_AppGroupIdentifier` (main app) and `AppGroupIdentifier` (extension) for shared storage.

Requirements:

- iOS 16.2+ for Live Activities. Push-to-start requires iOS 17.2+.
- Use a physical device (push tokens often don’t work on simulators).

### 2) Listen for tokens and state updates in JS

```tsx
import { addActivityTokenListener, addActivityPushToStartTokenListener, addActivityUpdatesListener } from 'voltra'

useEffect(() => {
  const subToken = addActivityTokenListener?.(({ activityID, activityName, activityPushToken }) => {
    // Send the token to your server for push updates to this activity
  })
  const subPushStart = addActivityPushToStartTokenListener?.(({ activityPushToStartToken }) => {
    // iOS 17.2+: Send token to your server to start a Live Activity remotely
  })
  const subUpdates = addActivityUpdatesListener?.(({ activityID, activityName, activityState }) => {
    // Track lifecycle: active | ended | stale | dismissed | pending
  })
  return () => {
    subToken?.remove?.()
    subPushStart?.remove?.()
    subUpdates?.remove?.()
  }
}, [])
```

### 3) APNs headers and payloads

Always set APNs headers for Live Activities:

```
apns-push-type: liveactivity
apns-topic: <your.app.bundle.id>.push-type.liveactivity
```

Payloads for our attributes/content-state:

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
    "content-state": {
      "uiJsonData": "<base64-of-utf8-voltraui-json>"
    },
    "alert": { "title": "", "body": "", "sound": "default" }
  }
}
```

Update (iOS 16.2+):

```json
{
  "aps": {
    "event": "update",
    "timestamp": 1754063621319,
    "content-state": {
      "uiJsonData": "<base64-of-utf8-voltraui-json>"
    }
  }
}
```

Notes:

- The extension chooses the correct region JSON at render time if you send a variants object (lockScreen / island.{minimal,compact,expanded}).
- Payload size is limited by ActivityKit (≈4 KB). Base64 inflates size by ~33%. Keep JSON minimal; avoid deep modifier trees.
- If you need images in a Live Activity, prefetch them in the app and write to the App Group container. Reference the resulting filenames in your JSON (not remote URLs).

### 4) App Groups for images and events

- App writes downloaded images into the App Group at the identifier configured by `VoltraUI_AppGroupIdentifier` (main app Info.plist).
- Extension reads images from the same App Group using `AppGroupIdentifier` (extension Info.plist).
- VoltraUI component events (e.g., button taps) can be forwarded via the same App Group queue and received in JS using `addVoltraUIEventListener`.

## Example gallery

The example app now ships a focused set of Live Activity demos at `example/screens/live-activities/LiveActivitiesScreen.tsx`. Each card highlights a different authoring pattern:

1. Basic live activity (inline JSX styles)

```tsx
const etaStartAt = Date.now()
const etaEndAt = etaStartAt + 90_000 // short countdown makes motion obvious

const ui = (
  <VStack
    identifier="basic-live-activity"
    style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}
  >
    <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Driver en route</Text>
    <Label title="Rider: Camila • LX27" imageURL="car.fill" style={{ color: '#CBD5F5', marginTop: 6 }} />
    <Timer
      startAtMs={etaStartAt}
      endAtMs={etaEndAt}
      mode="text"
      textStyle="timer"
      textTemplates={{ running: 'Arrives in {time}', completed: 'Driver arrived' }}
      style={{ color: '#CBD5F5', fontSize: 12, marginTop: 4 }}
      modeStyles={{ text: { tintColor: '#38BDF8' } }}
    />
    <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Building A · Lobby pickup</Text>
    <Button title="Contact driver" eventHandlerName="onPressContactDriver" style={{ marginTop: 12 }} />
  </VStack>
)
```

2. Shared styles with `StyleSheet.create`

```tsx
const boardingStartAt = Date.now()
const boardingEndAt = boardingStartAt + 120_000

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
  },
  title: {
    color: '#E0F2FE',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 14,
  },
  flightNumber: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '600',
  },
  chip: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    marginTop: 18,
    color: '#CBD5F5',
    fontSize: 13,
  },
})

const ui = (
  <VStack identifier="stylesheet-live-activity" style={StyleSheet.flatten(styles.card)}>
    <Text style={StyleSheet.flatten(styles.title)}>Morning Flight</Text>
    <Text style={StyleSheet.flatten(styles.subtitle)}>SFO → JFK · Gate A10</Text>
    <HStack style={{ marginTop: 14, alignItems: 'center' }}>
      <Text style={StyleSheet.flatten(styles.flightNumber)}>UA 2041</Text>
      <Spacer />
      <Label title="Boarding" imageURL="figure.walk" style={StyleSheet.flatten(styles.chip)} />
    </HStack>
    <Timer
      startAtMs={boardingStartAt}
      endAtMs={boardingEndAt}
      mode="text"
      textStyle="timer"
      textTemplates={{ running: 'Boarding closes in {time}', completed: 'Boarding closed' }}
      style={StyleSheet.flatten(styles.footer)}
      modeStyles={{ text: { tintColor: '#38BDF8' } }}
    />
  </VStack>
)
```

3. Liquid Glass surfaces (iOS 26+)

```tsx
const sessionStartAt = Date.now()
const sessionEndAt = sessionStartAt + 45_000
const cooldownEndAt = sessionStartAt + 20_000

const ui = (
  <GlassContainer spacing={10}>
    <GlassView
      modifiers={[{ name: 'glassEffect', args: { shape: 'roundedRect', cornerRadius: 22 } }]}
      style={{ padding: 18, borderRadius: 22 }}
    >
      <VStack>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Studio Session</Text>
        <Timer
          startAtMs={sessionStartAt}
          endAtMs={sessionEndAt}
          mode="text"
          textStyle="timer"
          textTemplates={{ running: 'Session ends in {time}', completed: 'Workout complete' }}
          style={{ color: '#CBD5F5', fontSize: 13, marginTop: 4 }}
        />
        <ProgressView
          startAtMs={sessionStartAt}
          endAtMs={sessionEndAt}
          mode="bar"
          style={{ tintColor: '#34D399', marginTop: 12, height: 6, borderRadius: 4 }}
        />
        <HStack style={{ marginTop: 14, alignItems: 'center' }}>
          <SymbolView
            name="figure.strengthtraining.traditional"
            tintColor="#34D399"
            style={{ width: 32, height: 32 }}
          />
          <Text style={{ color: '#34D399', marginLeft: 8, fontWeight: '600' }}>Active</Text>
          <Spacer />
          <Timer
            startAtMs={sessionStartAt}
            endAtMs={sessionEndAt}
            mode="text"
            textStyle="relative"
            textTemplates={{ running: '{time}', completed: '00:00' }}
            style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '500' }}
          />
        </HStack>
      </VStack>
    </GlassView>

    <GlassView
      modifiers={[{ name: 'glassEffect', args: { shape: 'capsule' } }]}
      style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 }}
    >
      <HStack style={{ alignItems: 'center' }}>
        <SymbolView name="heart.fill" tintColor="#F472B6" style={{ width: 20, height: 20 }} />
        <Text style={{ color: '#F8FAFC', fontWeight: '600', marginLeft: 8 }}>HR 132</Text>
        <Spacer />
        <Timer
          startAtMs={sessionStartAt}
          endAtMs={cooldownEndAt}
          mode="text"
          textStyle="timer"
          textTemplates={{ running: 'Next interval in {time}', completed: 'Interval done' }}
          style={{ color: '#F8FAFC', opacity: 0.8 }}
        />
      </HStack>
    </GlassView>
  </GlassContainer>
)
```

4. Tailwind-style `className` utilities

```tsx
const rideStartAt = Date.now()
const rideEndAt = rideStartAt + 90_000
const arrivalEndAt = rideStartAt + 45_000

const ui = (
  <VStack
    identifier="classnames-live-activity"
    className="p-6 rounded-3xl bg-[#111827]"
    style={{ width: '100%' }}
  >
    <Text className="text-white text-lg font-semibold">Morning Ride</Text>
    <Text className="text-gray-500 text-sm" style={{ marginTop: 4 }}>
      8.2 km · Battery 68%
    </Text>

    <ProgressView
      mode="bar"
      startAtMs={rideStartAt}
      endAtMs={rideEndAt}
      className="tint-emerald-500"
      style={{ marginTop: 16 }}
    />

    <Gauge
      startAtMs={rideStartAt}
      endAtMs={rideEndAt}
      className="gauge-accessoryLinear tint-emerald-500"
      hideValueLabel
      style={{ marginTop: 12 }}
    />

    <Timer
      startAtMs={rideStartAt}
      endAtMs={arrivalEndAt}
      mode="text"
      textStyle="timer"
      className="text-yellow-400 font-semibold text-sm"
      textTemplates={{ running: 'Arrives in {time}', completed: 'Arrived' }}
      style={{ marginTop: 12 }}
    />
  </VStack>
)
```

Kick off any of the cards with `useVoltraLiveActivity(ui, { endAllBeforeStart: true })` to stream updates to the native extension, or explore the full implementations in `example/screens/live-activities/`.

## Best practices and tips

- Use `endAllBeforeStart: true` during development so iOS doesn’t surface an older Live Activity.
- Keep compact layouts concise for Dynamic Island; prefer `HStack` with a `Label` + short `Text`.
- For user interactions, provide `identifier` on interactive components (e.g., `Toggle`) for easier event correlation.
- Colors accept CSS-like strings; stick to high-contrast values for readability.
- To tint a `ProgressView` or other accentable controls, use `style={{ tintColor: '#...' }}`, `className="tint-..."`, or an ordered modifier `{ name: 'tint', args: { color: '#...' } }`.
- To change Gauge appearance, use `gaugeStyle` ordered modifier or `className="gauge-..."`.

## Troubleshooting

- Old content still shows in the Dynamic Island

  - Cause: Multiple Live Activities may be running; iOS can show any of them.
  - Fix: Call `endAllLiveActivities()` before starting new content or use `startVoltraUI(..., { endAllBeforeStart: true })`.

- Exclamation/error icon instead of UI

  - Cause: JSON failed to decode in the extension.
  - Fix: Ensure your payload is a top-level array. The extension preserves arrays and wraps single objects into an array. If you see `voltraui_decode_error` in logs, check your JSON shape.

- Images
  - `Image` now supports React Native-style sources: `systemName`, `assetName`, or `source` (including `app-group://filename.png`). Ensure you copy remote assets into the shared App Group container before referencing them.

## Roadmap (short)

- Richer component event payloads
- More modifiers (frame, fonts, etc.)
- Expanded component prop coverage
