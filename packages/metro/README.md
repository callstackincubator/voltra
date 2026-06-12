![voltra-banner](https://use-voltra.dev/voltra-baner.jpg)

### Metro integration for Voltra client-rendered widgets

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

`@use-voltra/metro` adds the Metro-side plumbing for Voltra's client-rendered widgets. It scans `'use voltra'` components, wires the dev server middleware, resolves the hot-reload alias, and bundles widget code for release builds.

## Features

- **Metro config transformer**: Wrap your app's Metro config with `withVoltra()` to enable Voltra's widget pipeline.

- **Client-rendered widget scanning**: Discover exported components marked with `'use voltra'` and turn them into widget entries.

- **Dev server middleware**: Serve widget bundles from `/voltra` during development and keep the hot-reload path working.

- **Release bundling**: Build standalone widget bundles with the `bundle-widgets` CLI for production shipping.

- **Project-aware module resolution**: Resolve app dependencies from the consuming project's install layout, including pnpm setups.

## Documentation

This package powers the client-rendered widget workflow in Voltra. Relevant topics:

- [Getting Started](https://use-voltra.dev/getting-started/installation)
- [iOS Widgets](https://use-voltra.dev/ios/development/developing-widgets)
- [Android Widgets](https://use-voltra.dev/android/development/developing-widgets)
- [iOS API Reference](https://use-voltra.dev/ios/api/configuration)
- [Android API Reference](https://use-voltra.dev/android/api/plugin-configuration)

## Getting started

`@use-voltra/metro` is usually consumed through `@use-voltra/ios-client` or `@use-voltra/android-client`, but you can install it directly if you need to customize Metro yourself.

```sh
npm install @use-voltra/metro
```

Wrap your Metro config with `withVoltra`:

```ts
import { withVoltra } from '@use-voltra/metro'

export default withVoltra({
  projectRoot: __dirname,
  resolver: {
    sourceExts: ['ts', 'tsx', 'js', 'jsx'],
  },
})
```

If you are using client-rendered widgets, make sure your widget component includes the `'use voltra'` directive and follows the setup from the Voltra docs.

## Quick example

```ts
import { bundleWidgets, scanVoltraDirectives } from '@use-voltra/metro'

const widgets = scanVoltraDirectives({
  filePath: '/app/widgets/WeatherWidget.tsx',
  source: `
    export function WeatherWidget() {
      'use voltra'
      return null
    }
  `,
})

console.log(widgets)

await bundleWidgets({
  projectRoot: process.cwd(),
  outDir: './dist/widgets',
  platform: 'ios',
})
```

## Platform compatibility

This package works with Metro-based React Native apps on **iOS** and **Android** when you are using Voltra client-rendered widgets.

## Authors

Voltra is an open source collaboration between [Saúl Sharma](https://github.com/saulsharma) and [Szymon Chmal](https://github.com/szymonchmal) at [Callstack][callstack-readme-with-love].

If you think it's cool, please star it 🌟. This project will always remain free to use.

[Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the Callstack team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=voltra&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/@use-voltra/metro?style=for-the-badge
[license]: https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt
[npm-downloads-badge]: https://img.shields.io/npm/dm/@use-voltra/metro?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@use-voltra/metro
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ../../CONTRIBUTING.md
