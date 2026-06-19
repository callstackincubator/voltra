![voltra-banner](https://use-voltra.dev/voltra-baner.jpg)

### Voltra for Android — React Native client

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

`@use-voltra/android-client` is the Android React Native package for Voltra. It re-exports the `VoltraAndroid` JSX namespace and related APIs from `@use-voltra/android` (installed automatically as a dependency) and provides runtime APIs for Home Screen widgets, ongoing notifications, development previews, event listeners, and the Expo config plugin.

## Features

- **Home Screen widgets**: Update, reload, pin, and query widgets with `updateAndroidWidget`, `reloadAndroidWidgets`, `getActiveWidgets`, and more.

- **Dynamic Widgets** _(experimental)_: Declare a widget in app.json with an `id` and `entry`, default-export the widget module, and render it on-device (standalone Hermes) from its own JS bundle with live env (size, color scheme, Material You colors, locale, configuration).

- **Ongoing notifications**: Start and update promoted ongoing notifications with `useAndroidOngoingNotification` and related APIs.

- **Fast Refresh**: Previews integrate with your React Native dev workflow via `VoltraWidgetPreview` and `VoltraView`.

- **Image preloading**: Download remote images for widgets with `preloadImages` and `reloadWidgets`.

- **Server-driven widgets**: Store credentials for background widget fetches with `setWidgetServerCredentials`.

- **Expo config plugin**: Add `"@use-voltra/android-client"` to `app.json` to declare widgets, optional notifications, and build-time initial states.

## Dynamic Widgets (experimental)

> [!WARNING]
> Dynamic Widgets are **experimental** — usable in production at your own risk. The API
> and generated build output may change between releases.

Declare the widget in app.json with a stable `id` and a project-relative `entry` path. The entry
module must default-export the widget function or component; the exported name does not need to
match the widget id. Expo prebuild writes `.voltra/manifest.android.json`, and Metro reads that
manifest to bundle only the declared widgets. The widget renders on-device from its own JS bundle
in a standalone Hermes runtime, so it reacts to live environment values (size, color scheme,
Material You `materialColors`, locale, and `configuration`). In development the bundle is served by
Metro (editing the JSX hot-reloads the pinned widget); in release builds it is baked into the app's
assets at build time.

Configuration parameters declared in `app.json` (`appIntent.parameters`, with code-defined
defaults) surface as `env.configuration`. Android has no system-managed widget configuration UI
(unlike iOS's Edit Widget), so runtime values are set in-app via `setWidgetConfiguration` and
override the declared defaults.

Notes:

- The dev loop and release baking rely on Metro scaffolding in your project (see `example/metro`).
- iOS and Android widget declarations stay separate, and the same widget id can exist on both platforms as separate entries.
- Verify release rendering on a **real device** — emulators are unreliable for widget rendering.

## Documentation

The documentation is available at [use-voltra.dev](https://use-voltra.dev). Relevant topics for this package:

- [Installation](https://use-voltra.dev/getting-started/installation)
- [Android Setup](https://use-voltra.dev/android/setup)
- [Developing Dynamic Widgets](https://use-voltra.dev/android/development/dynamic-widgets)
- [Managing Ongoing Notifications](https://use-voltra.dev/android/development/managing-ongoing-notifications)
- [Plugin Configuration](https://use-voltra.dev/android/api/plugin-configuration)

## Getting started

> [!NOTE]
> Voltra isn't supported in Expo Go. Use [Expo Dev Client](https://docs.expo.dev/versions/latest/sdk/dev-client/) or a native build.

Install the Android client package:

```sh
npm install @use-voltra/android-client
```

Add the Expo plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "enableNotifications": true,
          "widgets": [
            {
              "id": "my_widget",
              "displayName": "My Widget",
              "description": "A Voltra widget",
              "targetCellWidth": 2,
              "targetCellHeight": 2
            }
          ]
        }
      ]
    ]
  }
}
```

Then run `npx expo prebuild --platform android` to generate the native project changes.

See the [Android setup guide](https://use-voltra.dev/android/setup) for detailed instructions.

## Quick example

```tsx
import { updateAndroidWidget, VoltraAndroid } from '@use-voltra/android-client'

const WeatherWidget = ({ temperature, condition }: { temperature: number; condition: string }) => (
  <VoltraAndroid.Box
    style={{
      padding: 16,
      backgroundColor: '#f0f0f0',
      borderRadius: 12,
      width: '100%',
      height: '100%',
    }}
  >
    <VoltraAndroid.Column>
      <VoltraAndroid.Text style={{ fontSize: 24, fontWeight: 'bold' }}>{temperature}°C</VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: '#666' }}>{condition}</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  </VoltraAndroid.Box>
)

export async function refreshWeatherWidget() {
  await updateAndroidWidget('my_widget', <WeatherWidget temperature={22} condition="Sunny" />)
}
```

## Platform compatibility

This package targets **Android** with Jetpack Compose Glance widgets. Import UI and runtime APIs from `@use-voltra/android-client`. For server-side rendering, use `@use-voltra/android-server` in your backend only.

## Authors

Voltra is an open source collaboration between [Saúl Sharma](https://github.com/saulsharma) and [Szymon Chmal](https://github.com/szymonchmal) at [Callstack][callstack-readme-with-love].

If you think it's cool, please star it 🌟. This project will always remain free to use.

[Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the Callstack team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=voltra&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/@use-voltra/android-client?style=for-the-badge
[license]: https://github.com/callstackincubator/voltra/blob/main/LICENSE.txt
[npm-downloads-badge]: https://img.shields.io/npm/dm/@use-voltra/android-client?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@use-voltra/android-client
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ../../CONTRIBUTING.md
