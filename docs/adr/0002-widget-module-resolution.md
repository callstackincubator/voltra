# 0002 — Widget module resolution

**Status:** Accepted

## Context

Widget source is loaded in three places, each with a different execution model:

1. `voltra apply` evaluates widget files in a Node VM to prerender initial states and to
   detect Dynamic Widgets (`packages/cli`).
2. The Expo config plugins do the same during prebuild (`packages/expo-plugin`, driven by
   `@use-voltra/ios-client` and `@use-voltra/android-client`).
3. Metro bundles Dynamic Widget entries for the device, where they run in a separate JS
   engine with no bridge and no native modules (`packages/metro`).

These had three independent notions of what a widget file may import. The two Node loaders
were forked copies that had already drifted apart — different resolvable extensions,
different Babel configuration lookup, different fallback presets — and the package redirect
that lets widget code import a client package existed in only one of them. Metro had a third
answer: it rejected every `react-native` import outright.

The practical consequence was that `import { StyleSheet } from 'react-native'` — the ordinary
way to keep styles out of the element tree — crashed `voltra apply` with
`Unexpected token 'typeof'`, because React Native's published entry point is untranspiled
Flow that Node cannot parse.

The deeper problem is not the missing shim but the missing single answer. When the three
environments disagree, a widget can prerender successfully and still fail to bundle, or —
worse — render differently on device than the build-time placeholder it was prerendered
from.

## Decision

`@use-voltra/compiler` owns widget module resolution, and all three environments consume it.

- **Policy.** `resolveWidgetImport(specifier, platform)` is the single source of truth for
  every bare import in widget code. It returns one of: pass the specifier through, resolve a
  different specifier instead, or reject with a message. Client packages
  (`@use-voltra/ios-client`, `@use-voltra/android-client`) resolve to their rendering package;
  `react-native` resolves to Voltra's shim; deep `react-native/...` paths are rejected.
- **Loader.** `createWidgetModuleLoader` is the one Babel + VM implementation. The CLI and the
  Expo plugins are thin adapters over it, supplying their own error type and warning sink.
- **Shim.** `@use-voltra/compiler/react-native/{ios,android}` is the `react-native` surface
  widget code sees. Both the Node loader and the Metro resolver serve the same file, so
  build-time evaluation and on-device rendering cannot diverge.

The shim is an allowlist, not a blocklist. It implements `StyleSheet` (`create` as identity,
`flatten`, `compose`, `absoluteFill`, `absoluteFillObject`, `hairlineWidth`) and `Platform`
(`OS`, `select`). Every other symbol — components, `Dimensions`, `Animated`, `PixelRatio`,
`Platform.Version` — throws a message naming the symbol and pointing at the Voltra
equivalent.

`Platform.OS` is the platform the widget is being built for, which every call site already
knows, so the loader takes it explicitly rather than guessing.

## Consequences

- Widget code can use `StyleSheet` and `Platform`, and the same file prerenders and bundles.
- Adding to the widget-visible surface means changing the shim, which serves all three
  environments at once. There is no way to fix one and forget the others.
- The allowlist means a `react-native` API that would silently misbehave in a widget fails the
  build instead. That is a deliberate trade: an explicit build error is cheaper than a widget
  that renders wrong on someone's Home Screen.
- `@use-voltra/compiler` now depends on `@babel/core` and ships a module that is bundled onto
  the device. Its scope is widget source tooling, not static analysis alone.
