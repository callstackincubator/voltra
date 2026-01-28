![voltra-banner](https://use-voltra.dev/voltra-baner.jpg)

### Build Live Activities and Widgets with JSX in React Native

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

Voltra turns React Native JSX into SwiftUI and Jetpack Compose Glance so you can ship custom Live Activities, Dynamic Island layouts, and Android Widgets without touching native code. Author everything in React, keep hot reload, and let the config plugin handle the native extension targets.

## Features

- **Ship Native Surfaces**: Create iOS Live Activities, Dynamic Island variants, and Android Home Screen widgets directly from React components - no Swift, Kotlin, or Xcode/Android Studio UI work required.

- **Fast Development Workflow**: Hooks respect Fast Refresh and both JS and native layers enforce platform-specific payload budgets.

- **Production-Ready Push Notifications**: Support for ActivityKit push tokens (iOS) and FCM (Android) to stream lifecycle updates and build server-driven refreshes.

- **Familiar Styling**: Use React Native style props and platform-native modifiers (SwiftUI/Glance) in one place.

- **Type-Safe & Developer-Friendly**: The Voltra schema, hooks, and examples ship with TypeScript definitions, tests, and docs so AI coding agents stay productive.

- **Works With Your Setup**: Compatible with Expo Dev Client and bare React Native projects. The config plugin automatically wires native extension targets for you.

## Documentation

The documentation is available at [use-voltra.dev](https://use-voltra.dev). You can also use the following links to jump to specific topics:

- [Quick Start](https://use-voltra.dev/getting-started/quick-start)
- [Development](https://www.use-voltra.dev/development/developing-live-activities)
- [Components](https://www.use-voltra.dev/components/overview)
- [API Reference](https://use-voltra.dev/api/configuration)

## Getting started

> [!NOTE]  
> The library isn't supported in Expo Go. To set it up correctly, you need to use [Expo Dev Client](https://docs.expo.dev/versions/latest/sdk/dev-client/).

Install the package:

```sh
npm install voltra
```

Add the config plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": ["voltra"]
  }
}
```

Then run `npx expo prebuild --clean` to generate the native extension targets.

See the [documentation](https://use-voltra.dev/getting-started/quick-start) for detailed setup instructions.

## Quick example

```tsx
import { useLiveActivity } from 'voltra/client'
import { Voltra } from 'voltra'

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

Voltra is a cross-platform library that supports:

- **iOS**: Live Activities and Dynamic Island (SwiftUI).
- **Android**: Home Screen Widgets (Jetpack Compose Glance).

## Authors

`voltra` is an open source collaboration between [Saúl Sharma](https://github.com/saul-sharma) and [Szymon Chmal](https://github.com/szymonchmal) at [Callstack][callstack-readme-with-love].

If you think it's cool, please star it 🌟. This project will always remain free to use.

[Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the Callstack team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=voltra&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/voltra?style=for-the-badge
[license]: https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt
[npm-downloads-badge]: https://img.shields.io/npm/dm/voltra?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/voltra
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ./CONTRIBUTING.md
