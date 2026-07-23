![voltra-banner](https://use-voltra.dev/voltra-baner.jpg)

### Voltra for iOS — React Native client

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

`@use-voltra/ios-client` is the iOS React Native package for Voltra. It re-exports the `Voltra` JSX namespace from `@use-voltra/ios` (installed automatically as a dependency) and provides runtime APIs for Live Activities and Home Screen widgets, development previews, event listeners, and the Expo config plugin.

## Features

- **Live Activities**: Start, update, and end activities with `useLiveActivity`, `startLiveActivity`, and related APIs.

- **iOS Widgets**: Update, schedule, reload, and query widgets with `updateWidget`, `scheduleWidget`, `getActiveWidgets`, and more.

- **Dynamic Widgets** _(experimental)_: Declare a widget in app.json with an `id` and `entry`, default-export the Dynamic Widget component, and render it on-device from runtime props and live environment values (family, color scheme, locale, configuration).

- **Fast Refresh**: Hooks and previews integrate with your React Native dev workflow.

- **Push & events**: Capture ActivityKit push tokens and component interactions via `addVoltraListener`.

- **Image preloading**: Download remote images for use in activities and widgets with `preloadImages` and `reloadLiveActivities`.

- **Expo config plugin**: Add `"@use-voltra/ios-client"` to `app.json` to generate the Live Activity extension, widget targets, and entitlements.

## Dynamic Widgets (experimental)

> [!WARNING]
> Dynamic Widgets are **experimental** — usable in production at your own risk. The API may
> change between releases.

Declare a Dynamic Widget in app.json with a stable `id` and a project-relative `entry` path. The
entry module must default-export the Dynamic Widget function or component; the exported name does
not need to match the Dynamic Widget id. A Dynamic Widget renders on-device, so it can react to both
runtime props and live environment values (widget family, color scheme, locale, and user
`configuration` from the native Edit Widget sheet).

The first argument is the Dynamic Widget props object. Use `updateDynamicWidget` in your app to
persist a new props object and re-render the installed Dynamic Widget with the matching id:

```tsx
// widgets/ios/inbox-widget.tsx
import { Voltra, type WidgetEnvironment } from '@use-voltra/ios'

type InboxDynamicWidgetProps = {
  headline?: string
  unreadCount?: number
}

export default function InboxDynamicWidget(
  props: InboxDynamicWidgetProps = {},
  env: WidgetEnvironment = {} as WidgetEnvironment
) {
  const headline = props.headline ?? 'Inbox'
  const unreadCount = props.unreadCount ?? 0

  return (
    <Voltra.VStack style={{ padding: 16, backgroundColor: '#111827' }}>
      <Voltra.Text style={{ color: 'white' }}>{headline}</Voltra.Text>
      <Voltra.Text style={{ color: '#34D399' }}>{unreadCount} unread</Voltra.Text>
      <Voltra.Text style={{ color: '#9CA3AF' }}>Family: {env.widgetFamily}</Voltra.Text>
    </Voltra.VStack>
  )
}
```

```ts
// App code
import { updateDynamicWidget } from '@use-voltra/ios-client'

await updateDynamicWidget('inbox_widget', { headline: 'Team inbox', unreadCount: 7 })
```

Dynamic Widget props must be JSON-serializable: strings, numbers, booleans, `null`, arrays, and nested
objects are supported. Values such as functions, `undefined`, `Date`, `BigInt`, and cyclic references
are not supported. Before the first `updateDynamicWidget` call, the entry receives `{}`. The latest
props object is stored by Dynamic Widget id, survives app process restarts, and is reused on
subsequent renders until another update replaces it or the app's data is cleared.

`updateDynamicWidget` is only for an entry-based Dynamic Widget. The legacy `updateWidget` API sends
pre-rendered variant payloads to a payload-driven widget and cannot update an entry-based Dynamic
Widget.

Configuration parameters declared in `app.json` (`appIntent.parameters`) are edited by the user in
the native iOS Edit Widget sheet and surface as `env.configuration`. Configuration is separate from
the Dynamic Widget props passed as the first argument; updating one does not replace the other.

Notes:

- iOS and Android widget declarations stay separate, and the same widget id can exist on both platforms as separate entries.
- Set `groupIdentifier` in the Voltra plugin configuration before calling `updateDynamicWidget`; the app and WidgetKit extension use the shared App Group to exchange runtime props.
- Rebuild the native iOS app after changing plugin configuration or upgrading to a package version that adds a native API.
- Verify release rendering on a **real device** — the iOS Simulator is unreliable for widget
  rendering.

## Documentation

The documentation is available at [use-voltra.dev](https://use-voltra.dev). Relevant topics for this package:

- [Installation](https://use-voltra.dev/getting-started/installation)
- [iOS Setup](https://use-voltra.dev/ios/setup)
- [Developing Live Activities](https://use-voltra.dev/ios/development/developing-live-activities)
- [Developing Dynamic Widgets](https://use-voltra.dev/ios/development/dynamic-widgets)
- [Plugin Configuration](https://use-voltra.dev/ios/api/plugin-configuration)
- [API Reference](https://use-voltra.dev/ios/api/configuration)

## Getting started

> [!NOTE]
> Voltra isn't supported in Expo Go. Use [Expo Dev Client](https://docs.expo.dev/versions/latest/sdk/dev-client/) or a native build.

Install the iOS client package:

```sh
npm install @use-voltra/ios-client
```

Add the Expo plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "groupIdentifier": "group.your.bundle.identifier",
          "enablePushNotifications": true
        }
      ]
    ]
  }
}
```

Then run `npx expo prebuild --platform ios` to generate the native extension targets.

See the [iOS setup guide](https://use-voltra.dev/ios/setup) for detailed instructions.

## Quick example

```tsx
import { useLiveActivity, Voltra } from '@use-voltra/ios-client'

export function OrderTracker({ orderId }: { orderId: string }) {
  const ui = (
    <Voltra.VStack style={{ padding: 16, borderRadius: 14, backgroundColor: '#111827' }}>
      <Voltra.Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Order #{orderId}</Voltra.Text>
      <Voltra.Text style={{ color: '#9CA3AF', marginTop: 6 }}>Driver en route · ETA 12 min</Voltra.Text>
    </Voltra.VStack>
  )

  const { start, update, end } = useLiveActivity(
    { lockScreen: ui },
    {
      activityName: `order-${orderId}`,
      autoStart: true,
      deepLinkUrl: `/orders/${orderId}`,
    }
  )

  return null
}
```

## Platform compatibility

This package targets **iOS 16.4+** (Live Activities) and supports Home Screen widgets on supported iOS versions. Import UI and runtime APIs from `@use-voltra/ios-client`. For server-side rendering, use `@use-voltra/ios-server` in your backend only.

## Authors

Voltra is an open source collaboration between [Saúl Sharma](https://github.com/saulsharma) and [Szymon Chmal](https://github.com/szymonchmal) at [Callstack][callstack-readme-with-love].

If you think it's cool, please star it 🌟. This project will always remain free to use.

[Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the Callstack team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=voltra&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/@use-voltra/ios-client?style=for-the-badge
[license]: https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt
[npm-downloads-badge]: https://img.shields.io/npm/dm/@use-voltra/ios-client?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@use-voltra/ios-client
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ../../CONTRIBUTING.md
