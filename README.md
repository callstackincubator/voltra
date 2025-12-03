![voltra-banner](https://voltra.dev/voltra-baner.jpg)

### Build Live Activities with JSX in React Native

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

Voltra turns React Native JSX into SwiftUI so you can ship custom Live Activities, Dynamic Island layouts without touching Xcode. Author everything in React, keep hot reload, and let the config plugin handle the extension targets.

## Features

- **Ship Native iOS Surfaces**: Create Live Activities, Dynamic Island variants, and static widgets directly from React components - no Swift or Xcode required.

- **Fast Development Workflow**: Hooks respect Fast Refresh and both JS and native layers enforce ActivityKit payload budgets.

- **Production-Ready Push Notifications**: Collect ActivityKit push tokens and push-to-start tokens, stream lifecycle updates, and build server-driven refreshes.

- **Familiar Styling**: Use React Native style props and ordered SwiftUI modifiers in one place.

- **Type-Safe & Developer-Friendly**: The Voltra schema, hooks, and examples ship with TypeScript definitions, tests, and docs so AI coding agents stay productive.

- **Works With Your Setup**: Compatible with Expo Dev Client and bare React Native projects. The config plugin automatically wires iOS extension targets for you.

## Documentation

The documentation is available at [voltra.dev](https://voltra.dev). You can also use the following links to jump to specific topics:

- [Quick Start](https://voltra.dev/docs/getting-started/quick-start)
- [API Reference](https://voltra.dev/docs/api/overview)
- [Examples](https://voltra.dev/docs/examples)

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

Then run `npx expo prebuild --clean` to generate the iOS extension target.

See the [documentation](https://voltra.dev/docs/getting-started/quick-start) for detailed setup instructions.

## Quick example

```tsx
import { useVoltra, Voltra } from 'voltra'

export function OrderTracker({ orderId }: { orderId: string }) {
  const ui = (
    <Voltra.VStack style={{ padding: 16, borderRadius: 14, backgroundColor: '#111827' }}>
      <Voltra.Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Order #{orderId}</Voltra.Text>
      <Voltra.Text style={{ color: '#9CA3AF', marginTop: 6 }}>Driver en route · ETA 12 min</Voltra.Text>
    </Voltra.VStack>
  )

  const { start, update, end } = useVoltra(
    { lockScreen: ui },
    {
      autoStart: true,
      deepLinkUrl: `/orders/${orderId}`,
    }
  )

  return null
}
```

## Platform compatibility

**Note:** This module is intended for use on **iOS devices only**.

## Made with ❤️ at Callstack

`voltra` is an open source project and will always remain free to use. If you think it's cool, please star it 🌟.

[Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=voltra&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/voltra?style=for-the-badge
[license]: https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt
[npm-downloads-badge]: https://img.shields.io/npm/dm/voltra?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/voltra
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ./CONTRIBUTING.md
