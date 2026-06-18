---
name: voltra
description: Build, review, refactor, configure, or debug Voltra code using Voltra JSX, Voltra JS APIs, the Expo config plugin, and the Voltra CLI. Use when the user asks about charts, Live Activities, Dynamic Island UI, iOS widgets, scheduled widgets, Android widgets, ongoing notifications, image handling, app.json plugin config, React Native CLI setup, or Voltra push update flows.
metadata:
  author: 'Saúl Sharma (https://x.com/saul_sharma), Szymon Chmal (https://x.com/chmalszymon)'
  version: 2.0.0
---

# Voltra

Use this as the single Voltra skill entrypoint. Keep all product-wide ground truth here and load references from `references/` as needed.

## Voltra-Wide Ground Truth

- Never generate native platform UI code for Voltra tasks. Use Voltra JSX and Voltra JS APIs.
- Do not generate Swift, Kotlin, Java, Objective-C, or platform XML unless the user explicitly asks to edit an existing Voltra-supported Android widget preview XML file.
- Always solve Voltra tasks through Voltra JavaScript or TypeScript APIs, JSX components, and the Expo config plugin first.
- If a task appears to require native code, first check whether Voltra already exposes a JS API or config option. Prefer that path.
- Do not scaffold native extension code manually. Voltra's config plugin owns native target setup.
- Do not use plain React Native primitives inside Voltra-rendered trees. Avoid `View`, `Text`, `Pressable`, `TouchableOpacity`, and similar RN UI primitives for Live Activity or Android widget content.
- For iOS app code, import `Voltra` from `@use-voltra/ios` and runtime APIs from `@use-voltra/ios-client`.
- For Android app code, import `VoltraAndroid` from `@use-voltra/android` and runtime APIs from `@use-voltra/android-client`.
- Keep iOS and Android authoring paths separate unless the user explicitly asks for a shared abstraction.
- Update config before writing registration-dependent UI code.
- Treat images as a Voltra concern, not a native-code concern. Prefer Voltra image props, Voltra asset directories, and Voltra preloading APIs.
- When guidance conflicts, prefer this skill's internal references first, then hosted docs on `use-voltra.dev`.
- Use hosted docs on `https://use-voltra.dev` when deeper documentation is needed.

## Reference Routing

Read only the references needed for the current task:

- Setup, install, Expo Dev Client, `expo prebuild`: `references/setup.md`
- React Native CLI projects and `voltra apply`: `references/react-native-cli.md`
- `app.json`, `app.config.*`, plugin keys, widget registration, `groupIdentifier`, `enablePushNotifications`: `references/app-config.md`
- Exact plugin fields and widget registration schema: `references/plugin-schema.md`
- iOS Live Activities, Dynamic Island, lock screen variants, supplemental activity families: `references/ios-live-activities.md`
- Exact Live Activity variant shapes: `references/variant-shapes.md`
- iOS Home Screen widgets, accessory widgets, scheduled widgets, widget timelines, widget families, `VoltraWidgetPreview`, `updateWidget`, `scheduleWidget`, `reloadWidgets`, `getActiveWidgets`: `references/ios-widgets.md`
- Exact iOS widget families and fallback behavior: `references/widget-families.md`
- Charts for iOS widgets, Live Activities, and Android widgets: `references/charts.md`
- Android widgets, Android widget previews, pre-rendering, widget updates: `references/android-widgets.md`
- Android ongoing notifications, notification channels, and background-task updates: `references/android-ongoing-notifications.md`
- Server-driven widgets, `serverUpdate`, widget polling flows, `createWidgetUpdateHandler`, `setWidgetServerCredentials`, `clearWidgetServerCredentials`: `references/server-driven-widgets.md`
- Android component choices and widget API checklist: `references/component-mapping.md`, `references/runtime-api-checklist.md`
- APNS, push tokens, push-to-start, channel IDs, server-rendered Live Activity payloads: `references/ios-server-updates.md` and usually `references/ios-live-activities.md`
- Exact APNS flow details: `references/push-flow.md`
- Image handling for Voltra surfaces: `references/images.md` plus the target surface reference

## Working Style

1. Identify the target platform and surface first.
2. Confirm the correct Voltra namespace and JS entrypoint.
3. If the task involves charts, verify the public JSX props and platform behavior before writing code or docs.
4. Update config before writing registration-dependent UI code.
5. Read only the domain references needed for the task.
6. Use Voltra APIs that already exist in the repo before inventing new abstractions.
7. Keep answers scoped to the requested platform.

## Reference Index

- `references/source-of-truth.md`
- `references/images.md`
- `references/setup.md`
- `references/react-native-cli.md`
- `references/app-config.md`
- `references/plugin-schema.md`
- `references/ios-live-activities.md`
- `references/variant-shapes.md`
- `references/ios-widgets.md`
- `references/widget-families.md`
- `references/charts.md`
- `references/android-widgets.md`
- `references/android-ongoing-notifications.md`
- `references/server-driven-widgets.md`
- `references/component-mapping.md`
- `references/runtime-api-checklist.md`
- `references/ios-server-updates.md`
- `references/push-flow.md`
