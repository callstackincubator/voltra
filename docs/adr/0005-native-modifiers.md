# ADR 0005: Native modifiers

Status: Proposed

## Introduction

Voltra's `style` prop is a React Native flavoured subset of what SwiftUI and
Jetpack Glance can do. When a widget needs something outside that subset,
such as `widgetURL`, `privacySensitive`, `containerBackground`, a Glance
`semantics { contentDescription }`, or a click that runs the app's own
`ActionCallback`, there is no way to express it from JSX today. The only
escape hatches are per-component props and hand-edited generated files,
which prebuild overwrites.

This ADR adds a `modifiers` prop to every component. It carries an ordered
list of platform-native modifiers to the device, where the renderer applies
them on top of the component. The catalog is typed per platform, so
`Voltra.Text` accepts only SwiftUI modifiers and `VoltraAndroid.Text`
accepts only Glance modifiers. Users can register their own modifiers in
Swift and Kotlin and call them from JSX with the same mechanism.

Native modifiers are designed for Dynamic rendering (ADR 0001, ADR 0002),
where the tree is produced on the device and never pushed. Every renderer
accepts them, including the payload renderers, but the documentation is
explicit that using them in a pushed Live Activity or a payload widget is
unsafe because of the payload size limit.

```tsx
import { Voltra } from '@use-voltra/ios'

const { containerBackground, widgetURL, privacySensitive } = Voltra.modifiers

export default function Portfolio({ balance }: { balance: string }) {
  return (
    <Voltra.VStack modifiers={[containerBackground('#101828'), widgetURL('myapp://portfolio')]}>
      <Voltra.Text modifiers={[privacySensitive()]}>{balance}</Voltra.Text>
    </Voltra.VStack>
  )
}
```

```tsx
import { VoltraAndroid } from '@use-voltra/android'

const { appWidgetBackground, semantics, clickable, runCallback } = VoltraAndroid.modifiers

export default function Portfolio() {
  return (
    <VoltraAndroid.Box modifiers={[appWidgetBackground(), semantics({ contentDescription: 'Portfolio' })]}>
      <VoltraAndroid.Text modifiers={[clickable(runCallback('com.example.RefreshCallback', { scope: 'all' }))]}>
        Refresh
      </VoltraAndroid.Text>
    </VoltraAndroid.Box>
  )
}
```

## Context

Everything below was checked against the repository, the AndroidX Glance
sources (`androidx-main`, identical to the 1.2.0 API surface that the
Android client depends on), and Apple's WidgetKit and SwiftUI documentation.

### How the tree reaches native code today

- JSX becomes a JSON node tree in `packages/core/src/renderer/renderer.ts`.
  A node is `{ t, i?, c?, p? }`; props go through `transformProps`, which
  special-cases `style`, treats any array-valued prop as React children, and
  passes other values through with `shorten()` applied to the key.
- Dynamic Widgets on both platforms and Dynamic Live Activities run the
  bundled JS on the device (JSC in the iOS widget extension, Hermes in the
  Android app process) and cross the boundary as JSON strings only. There
  are no host objects, no JSI bindings, and no closures survive the trip.
  The Metro-generated entry calls `renderVoltraVariantToJson` or
  `renderAndroidVariantToJson` for widgets and `renderLiveActivityToJson`
  for Live Activities and returns `JSON.stringify(result)`.
- Payload renderers use the same core renderer and the same native views.
  The push path for Live Activities is `renderLiveActivityToString` from
  the app or `@use-voltra/ios/server`, and it shares
  `renderLiveActivityToJson` with the Dynamic entry. So "which function was
  called" cannot tell Dynamic from payload; an explicit option can.
- On iOS every component funnels through one call, `.applyStyle(...)` in
  `ui/Style/View+applyStyle.swift`, and every component is dispatched from
  one `switch` in `VoltraElementView` (`shared/VoltraNode.swift`). On
  Android every renderer calls `resolveAndApplyStyle` in
  `glance/StyleUtils.kt`, which builds the `GlanceModifier` chain, and
  `applyClickableIfNeeded` appends `clickable` afterwards.
- Two decoding traps constrain the wire format. `transformProps` feeds any
  array into `renderNode`, which throws on plain objects. The Kotlin
  `VoltraDecompressor` recurses into nested maps and lists, rewrites their
  keys through `ShortNames.expand`, and treats any nested map with a numeric
  `t` as an embedded element. A plain string prop passes through both
  untouched. `Chart.marks` and `Image.source` already use JSON-encoded
  strings for this reason.
- The generator (`packages/generator/data/components.json`) is the single
  source of truth for components and props and emits TypeScript, Swift and
  Kotlin. It has per-component platform availability but no per-parameter
  availability and no concept of a cross-cutting prop. `VoltraBaseProps`
  (`id`, `style`, `children`) is hand-written in each platform package.
- The iOS config plugin already adds every `.swift` file found in the widget
  target directory to the extension's sources build phase. Android has no
  equivalent; generated receivers live in the app module and are rewritten
  on every prebuild.

### What the two native modifier systems really are

SwiftUI and Glance both call the concept "modifier", but they behave
differently, and the design must not pretend otherwise.

**SwiftUI.** A modifier wraps a view and returns a new view, so the static
type of a chain encodes its length and order, and order changes the result
(`frame` then `border` outlines the frame; `border` then `frame` hugs the
text, per Apple's "Configuring views"). A runtime list therefore needs type
erasure at each link. `AnyView` is on Apple's list of views supported in
widgets. Its cost is performance and identity: when the erased type changes
between two timeline entries or activity states SwiftUI rebuilds instead of
animating. Expo UI solves this with a single `StableViewModifier` per link
whose erased type does not depend on which modifier it holds, so the chain
shape depends only on the list length. Widgets and Live Activities archive
the view in the extension process and render it elsewhere, so closures never
run at render time. Only value-bearing modifiers make sense; `onAppear`,
gestures, `task`, and state mutation are inert. Some modifiers are
type-specific (`Text.bold()` returns `Text`); those need a separate typed
path and are out of scope for the first version because `style` already
covers font weight, style and decoration.

**Glance.** `GlanceModifier` is an ordered chain (`CombinedGlanceModifier`,
`foldIn`), but `applyModifiers` in `glance-appwidget` consumes it as a
flat set keyed by element type: width, height, background, corner radius,
visibility, action, semantics, and so on each keep the last value, and
padding is summed. Padding-before-background and background-before-padding
render the same. `applyModifiers` is `internal` with a closed `when`; a
third-party `GlanceModifier.Element` compiles, travels through the chain,
and is dropped with `Log.w("Unknown modifier ...")`. Custom Glance modifiers
therefore can only be compositions of the built-in ones, plus `Action`
implementations that Glance knows (`actionStartActivity`,
`actionSendBroadcast`, `actionStartService`, `actionRunCallback`, and
lambda actions). Scope-restricted modifiers exist: `defaultWeight` is a
`RowScope`/`ColumnScope` member, `selectableGroup` throws outside Row and
Column, `appWidgetBackground` must be unique in a widget, and
`cornerRadius` is a no-op with a warning below API 31. Lambda actions need
a live composition and a key, and cannot cross the JSON boundary as code.

**Prior art.** Expo UI (`@expo/ui/swift-ui/modifiers`) is the closest
existing API: an ordered array of `{ $type, ...params }` records built by
small factory functions, a string-keyed registry of `ViewModifier` structs
on the Swift side, availability gating inside each modifier's `body`,
unknown types as no-ops, and a documented way for users to register their
own. No public library serializes Glance modifiers from JSON.

### Rules this design follows

1. One insertion point per layer. The JS renderer, the Swift view tree, and
   the Kotlin renderer each gain exactly one place that knows about
   modifiers. No component file changes on any platform.
2. Type safety by construction. The wrong platform's modifier is a
   TypeScript error, not a runtime warning.
3. Hand-written on both sides, tested for parity. A modifier is one
   TypeScript factory and one native implementation. A fixture produced by
   the TypeScript tests and decoded by the native tests keeps them in step;
   there is no second manifest and no generator target.
4. One renderer, one contract. Every renderer accepts modifiers and emits
   the same wire format, so native code stays kind-agnostic (ADR 0000) and
   no entry point branches on engine. The size risk of the payload engine is
   handled by documentation and the existing budget check, not by a gate.
5. Never crash the widget. Unknown or unavailable modifiers log and no-op
   on the device.

## Decision

### JSX API

Every component gains `modifiers?: readonly Modifier[]` in its base props.
Modifiers are values produced by factory functions that live on the
existing component namespaces, `Voltra.modifiers` and
`VoltraAndroid.modifiers`. There is no new package entry point: subpaths in
this repository mark runtime boundaries (`./server` is Node-only), and
modifier factories are pure functions with no such boundary. Placing them
on the namespace rather than as flat exports keeps generic names such as
`padding`, `size`, `background` and `clickable` from colliding with user
identifiers, and one import brings both components and modifiers.

Factories return frozen plain objects, `{ $type: 'padding', all: 8 }`, with
a type-only brand that carries the platform:

```ts
declare const MODIFIER_BRAND: unique symbol
type IosModifier = { readonly $type: string; readonly [MODIFIER_BRAND]: 'ios' }
type AndroidModifier = { readonly $type: string; readonly [MODIFIER_BRAND]: 'android' }
```

`VoltraBaseProps` on iOS declares `modifiers?: readonly IosModifier[]` and
`VoltraAndroidBaseProps` declares `modifiers?: readonly AndroidModifier[]`,
both in the hand-written `baseProps.tsx` that the generated component props
already extend. A `VoltraAndroid` modifier on a `Voltra` component fails to
compile. Nothing at runtime branches on platform; each package only knows
its own catalog. The first version has no per-component scope: every
modifier in the catalog applies to any view, and text-typed SwiftUI
modifiers are excluded (see Open questions).

The list is ordered and applied in order on iOS. On Android order is
irrelevant except that repeated `padding` sums, which is Glance's own rule.
Modifiers are applied after `style`, wrapping the fully styled component.
Where a native modifier and a style key set the same thing, the modifier
wins, because it is applied last on iOS and Glance keeps the last value on
Android. The one exception is Glance padding, which adds. Nesting a `View`
or `Box` is the way to place a modifier inside the style chain; the
documentation says so.

### Wire format

The renderer's `transformProps` gains a second special case next to `style`:
when it meets the `modifiers` key it emits a JSON-encoded string under a
new short name registered in `components.json`. `m` is taken by `margin`;
the generator's short-name validation picks and checks the new one. A
string survives every existing parsing layer on both platforms without
changes: the core renderer does not treat it as children, the Kotlin
decompressor does not rewrite its keys, and both `VoltraElement`
implementations pass it through as a prop. The native side parses the string
with its platform JSON decoder at the single application point.

Each entry is `{ "$type": "<name>", ...params }`. `$type` is the name the
factory was created with; params are the factory's parameter names with
plain JSON values.
Colors, sizes and insets use the same string and number forms as `style`,
so `JSColorParser` and `JSStyleParser` on each platform decode them.

The descriptors are not short-named or deduplicated. Payload size is not a
concern where the feature is meant to be used: Dynamic trees are produced
on the device and never pushed, and the prerendered `initialStatePath` for a
widget with `entry` ships inside the app.

### Engine support and payload size

No renderer rejects modifiers. The Dynamic entries
(`renderVoltraVariantToJson`, `renderAndroidVariantToJson`, the in-app
`VoltraView` preview, and the Metro-generated Dynamic Live Activity entry)
and the payload entries (`renderWidgetToString`, `renderAndroidWidgetToJson`,
`renderLiveActivityToString`, and the app-side `startLiveActivity` and
`updateLiveActivity`) all emit the same prop. The same JSX therefore renders
the same way in both engines, and a component shared between engines needs
no branch.

What differs is the cost. A pushed Live Activity update has a hard 4 KB
ActivityKit limit and Voltra's enforced budget of 3345 bytes after brotli
compression (`packages/core/src/payload.ts`), and payload widgets travel
through the same compression and storage path. A modifier list is a
JSON-encoded string with full parameter names, so a handful of modifiers
can consume a meaningful share of that budget, and every update carries
them again. The existing `ensurePayloadWithinBudget` check still throws when
a payload goes over, and the payload-size snapshot test in CI still fails
when an example grows. The documentation states that native modifiers are
not safe on payload widgets and pushed Live Activities for this reason, and
recommends the Dynamic engine for any UI that needs them. This is the
maintainers' call: an escape hatch that works everywhere and warns is
preferred over one that refuses.

### Definition in TypeScript and native code

There is no manifest and no generator output for modifiers. The generator
exists because a component prop must agree across TypeScript, Swift and
Kotlin at once; a modifier exists on one platform only, so it is defined
twice, by hand:

- TypeScript: one factory per modifier in `packages/ios/src/modifiers/` or
  `packages/android/src/modifiers/`, typed parameters, a JSDoc comment with
  the availability (`@since iOS 17.0`, `@since Android 12`), collected in
  the namespace's `index.ts`.
- Swift: one `ViewModifier` struct per modifier under
  `packages/ios-client/ios/ui/Modifiers/`, decoding its parameters from the
  descriptor dictionary with the existing `JSColorParser` and
  `JSStyleParser`, gated with `#available` in `body`, and returning
  `content` unchanged when unavailable, following the `glassEffect`
  precedent.
- Kotlin: one factory per modifier under
  `packages/android-client/android/src/main/java/voltra/modifiers/`,
  decoding with the existing style parsers and gating on
  `Build.VERSION.SDK_INT` as `cornerRadius` does today.

Parity is a test, not a code generator. The TypeScript test suite calls
every factory with representative arguments and writes the results to a
checked-in fixture, one per platform, next to the Swift and Kotlin test
targets. The Swift test in `ios/Tests/VoltraSharedTests` and the Kotlin
test under `android/src/test` decode every fixture entry through the
registry and fail on an unknown `$type` or a parameter that does not decode.
A modifier added on one side without the other fails CI. The wire prop name
`modifiers` gets one short-name entry in `components.json`, the same way
`style` has one, so both native `props` accessors expand it.

### iOS application

`packages/ios-client/ios/ui/Modifiers/` holds:

- `VoltraModifierRegistry`: a string-keyed table of factories
  `([String: Any]) throws -> any ViewModifier`, populated by a hand-written
  built-in table and open to `register(_:factory:)` for user code.
- `VoltraStableModifier`: one `ViewModifier` whose `body` looks up the
  `$type`, decodes the parameters, and applies the result through a
  type-erased wrapper; unknown or failing entries return `content`
  unchanged. Every link in the chain has this same type, so the erased
  shape of the view depends only on the list length, and timeline-entry
  and activity-state diffs still animate when only values change.
- `View.applyNativeModifiers(_:)`: a `reduce` over the decoded list.

The single insertion point is `VoltraElementView` in `shared/VoltraNode.swift`:
the existing `switch` is wrapped in a `Group` with
`.applyNativeModifiers(element.nativeModifiers)`. No view under `ui/Views`
changes, and `applyStyle` keeps its signature.

The initial iOS catalog is limited to value-only modifiers that matter in
widgets and Live Activities: `widgetURL`, `containerBackground`,
`widgetAccentable`, `privacySensitive`, `redacted`, `unredacted`,
`invalidatableContent`, `contentTransition`, `transition`, `animation`,
`dynamicTypeSize`, `containerRelativeFrame`, `activityBackgroundTint`,
`activitySystemActionForegroundColor`, `clipShape`, `blur`, `grayscale`,
`saturation`, `brightness`, `contrast`, `blendMode`, `rotationEffect`,
`scaleEffect`, `offset`, `fixedSize`, `layoutPriority`, `minimumScaleFactor`,
`truncationMode`, `multilineTextAlignment`, `monospacedDigit`, and
`symbolEffect`. Modifiers that take closures, gestures, bindings or
presentation (`onAppear`, `onTapGesture`, `sheet`, `task`) are excluded
because WidgetKit never runs them. `widgetLabel` and `widgetCurvesContent`
wait for accessory families.

### Android application

`packages/android-client/android/src/main/java/voltra/modifiers/` holds:

- `VoltraModifierRegistry`: a string-keyed table of
  `@Composable (Map<String, Any?>) -> GlanceModifier` factories, populated
  by a hand-written table and open to `register` for user code. Factories are
  composable so they can read `LocalContext`, `GlanceTheme` and build
  actions.
- `GlanceModifier.applyNativeModifiers(descriptors)`: a fold that calls
  `then` on each factory result and logs and skips unknown types.

The single insertion point is `resolveAndApplyStyle` in
`glance/StyleUtils.kt`, after `applyStyle` and before the caller's
`applyClickableIfNeeded`. Because Glance keeps the last action,
`applyClickableIfNeeded` skips when the descriptors already contain a
`clickable`; that is the one line of coordination between the two and it
lives in `StyleUtils.kt`. The scoped weight path in `LayoutRenderers.kt`
already goes through `resolveAndApplyStyle`, so children of `Row` and
`Column` get modifiers without further changes.

The Android catalog is the public `GlanceModifier` surface minus what
`style` already covers or what cannot be typed on the child: `padding`,
`absolutePadding`, `width`, `height`, `size`, `fillMaxWidth`,
`fillMaxHeight`, `fillMaxSize`, `wrapContentWidth`, `wrapContentHeight`,
`wrapContentSize`, `background` (color, day/night pair, or preloaded image
with content scale and alpha), `cornerRadius`, `visibility`, `semantics`,
`appWidgetBackground`, and `clickable`. `clickable` takes an action value
built by `startActivity` (component name or deep link intent),
`sendBroadcast`, `startService`, or `runCallback` (fully qualified
`ActionCallback` class name plus string, number and boolean parameters).
`runCallback` is the Android escape hatch to arbitrary native code that
survives without a live composition; lambda actions are not exposed because
a JS closure cannot cross the boundary. `defaultWeight` stays behind
`style.flex`, and `selectableGroup` is excluded because both depend on the
parent, which the child's type cannot see.

### User-defined modifiers

The same registries accept user code, which is the point of the feature.

- JS: `createIosModifier<Params>(name)` and `createAndroidModifier<Params>(name)`
  return a typed factory with the right brand, so a custom modifier is as
  type-safe at the call site as a built-in one. They are the same helpers
  the built-in catalog is written with.
- iOS: the user adds a Swift file to the widget target directory; the config
  plugin already compiles it. The file registers its modifiers through a
  `VoltraModifierProvider` conformance that the generated
  `VoltraWidgetBundle.swift` invokes at startup, listed under a new
  `nativeModifiers.ios` entry in the plugin config so registration is
  compile-checked rather than discovered by reflection.
- Android: a `nativeModifiers.android` entry names Kotlin classes in the
  app module implementing `VoltraModifierProvider`; the CLI generates a
  registration call in the generated receiver setup, next to where widget
  receivers are generated today. The Kotlin file lives in the user's app
  module and is not touched by prebuild.

Parity between the JS factory and the native decoder is the user's
responsibility for custom modifiers, and the documentation says so.

### Documentation

New pages `ios/development/native-modifiers.md` and
`android/development/native-modifiers.md` on the website, each listing the
catalog with availability, the ordering rules, and the custom-modifier
walkthrough. Each page opens with a warning box: native modifiers are meant
for Dynamic Widgets and Dynamic Live Activities; on payload widgets and
pushed Live Activities they count against the payload size limit and can
push an update over the 4 KB ActivityKit cap, so they are not safe there.
The Dynamic Widgets, Dynamic Live Activities, and payload-size pages link
to them.

## Implementation plan

1. **Plumbing.** The branded types and `createIosModifier` /
   `createAndroidModifier` helpers, the `modifiers` namespace on `Voltra`
   and `VoltraAndroid`, the `modifiers` branch in `transformProps`, the
   short-name entry, the Swift and Kotlin registries and their single
   insertion points, and three modifiers per platform to prove the path end
   to end (`widgetURL`, `privacySensitive`, `clipShape`; `padding`,
   `cornerRadius`, `clickable(startActivity)`). Tests: renderer output in
   both the single-root and the multi-root renderer, a payload-size
   snapshot for a modifier-heavy Live Activity so the cost is visible, the
   fixture-based parity tests, Swift registry unit tests, Kotlin unit and
   Robolectric render tests through `RemoteViews.apply` as ADR 0004 does.
2. **Catalog.** Write the lists above on both sides, gate availability,
   write both website pages, and add example Dynamic Widgets using them.
3. **Custom modifiers.** The `VoltraModifierProvider` protocols, config
   validation in the shared module, generated registration on both
   platforms, and the walkthrough.

Each step is its own pull request with a version plan touching
`@use-voltra/core`, `@use-voltra/ios`, `@use-voltra/android`,
`@use-voltra/ios-client`, `@use-voltra/android-client`, and, for step 3,
`@use-voltra/expo-plugin` and `@use-voltra/cli`. The payload schema
version does not change: the new prop is optional, and an older client
meeting it ignores an unknown prop and renders the component without its
modifiers.

## Consequences

- Widgets gain the full value-bearing SwiftUI and Glance modifier surface,
  and a documented door to user-written native code, without touching any
  component file when the catalog grows.
- The type system carries the platform split. There is no `Platform.select`
  and no `if (isIos)` in user code or in Voltra's renderer.
- iOS pays one `AnyView` per modifier link. The stable-link design keeps
  animations across entries, but a widget that changes the length of a
  modifier list between entries rebuilds that subtree.
- Glance semantics leak through by design: order does not matter on
  Android, padding sums, and `cornerRadius` does nothing below API 31.
  Documenting this is cheaper than emulating SwiftUI on RemoteViews.
- Payload widgets and pushed Live Activities can use modifiers, at the
  cost of payload bytes on every update. The documentation says they are
  unsafe there; the budget check and the size snapshots are the guard
  rails. An older client receiving a modifier-bearing payload renders the
  component without the modifiers.
- Contributors adding a modifier write one TypeScript factory and one
  native implementation, then update the parity fixture. The generator is
  untouched.

## Alternatives considered

### Widen `style` instead of adding `modifiers`

Rejected. `style` is an unordered object shared in shape across platforms,
and its keys are meant to be portable. SwiftUI modifiers are ordered and
platform-specific, and Glance modifiers include actions. Mixing them into
`style` would lose ordering on iOS and blur what is portable.

### Ship modifier descriptors as a JSON array in the props object

Rejected for the first version. It would require the Kotlin decompressor
and the Swift `props` expansion to learn one opaque key each, which is two
more places that know about modifiers, and the array-as-children rule in
`transformProps` would still need a special case. A string needs zero
changes below the application point.

### A single cross-platform modifier vocabulary with per-platform mapping

Rejected. The intersection is small and the semantics differ (ordering,
padding accumulation, actions). A shared vocabulary would either hide those
differences or reintroduce platform branches. Portable styling is `style`'s
job.

### A `modifiers.json` manifest and generator target

Considered, mirroring `components.json`: it would emit the TypeScript
factories, native parameter decoders and registration tables from one
file. Rejected because a modifier lives on one platform, so there are two
definitions to keep in step rather than three, each a few lines. A
generator would add a schema, a validator, three emitters and a formatting
step to save that. The fixture-based parity test gives the same guarantee
with no tooling.

### A `@use-voltra/ios/modifiers` subpath entry point

Considered. Rejected because subpaths in this repository separate runtime
boundaries (`./server`), and modifier factories have none. A namespace on
`Voltra` and `VoltraAndroid` needs no `package.json` change and avoids the
name collisions that flat exports of `padding`, `size` and `clickable`
would cause.

### Reflection-based dispatch to SwiftUI or Glance functions by name

Rejected. SwiftUI modifiers are generic functions with no runtime lookup;
Glance's `applyModifiers` is closed. A registry of hand-written
implementations keyed by name is the only mechanism that both
platforms support and that a test can verify.

### Reject modifiers in payload renderers

Considered: a `nativeModifiers` option on the rendering context, set only
by the Dynamic entries, with `transformProps` throwing otherwise. It would
make the Dynamic-only intent mechanical. Rejected by the maintainers in
favour of allowing the feature everywhere and documenting the size risk:
the payload renderers already enforce a byte budget, a shared component
should render the same in both engines, and a refusal would need an
`env`-based branch in user code that this ADR set out to avoid.

### Short-name the modifier descriptors

Considered, since payload renderers now accept modifiers. Rejected for the
first version: brotli already removes most of the repetition, it would
need a second short-name table kept in step by hand, and the point of
the documentation warning is that modifiers do not belong in pushed
payloads. It can be revisited if real payload usage appears.

## Open questions

1. Should `modifiers` on iOS also support a `Text`-typed path (`bold`,
   `italic`, `kerning`) in the first version, or is `style` enough? If it
   comes later, per-component scope can be added as a `modifierScope` field
   on `components.json` entries, flowing into the generated props, without
   a separate modifier manifest.
2. Should user modifier registration be config-driven, as decided above, or
   convention-driven (a class with a well-known name found at startup)?
   Config-driven fails at compile time; convention-driven needs no plugin
   change.
3. Is `runCallback` with a class name string an acceptable API on Android,
   or should the CLI generate a typed enum of callbacks declared in config?
