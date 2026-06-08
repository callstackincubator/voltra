![voltra-banner](https://use-voltra.dev/voltra-baner.jpg)

### Voltra for Android — React Native client

[![mit licence][license-badge]][license] [![npm downloads][npm-downloads-badge]][npm-downloads] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

`@use-voltra/android-client` is the Android React Native package for Voltra. It re-exports the `VoltraAndroid` JSX namespace and related APIs from `@use-voltra/android` (installed automatically as a dependency) and provides runtime APIs for Home Screen widgets, ongoing notifications, development previews, event listeners, and the Expo config plugin.

## Features

- **Home Screen widgets**: Update, reload, pin, and query widgets with `updateAndroidWidget`, `reloadAndroidWidgets`, `getActiveWidgets`, and more.

- **Ongoing notifications**: Start and update promoted ongoing notifications with `useAndroidOngoingNotification` and related APIs.

- **Fast Refresh**: Previews integrate with your React Native dev workflow via `VoltraWidgetPreview` and `VoltraView`.

- **Image preloading**: Download remote images for widgets with `preloadImages` and `reloadWidgets`.

- **Gradient backgrounds**: Use `style.backgroundImage` with CSS `linear-gradient(...)`, `radial-gradient(...)`, or `conic-gradient(...)` strings for Android widget backgrounds.

- **Server-driven widgets**: Store credentials for background widget fetches with `setWidgetServerCredentials`.

- **Expo config plugin**: Add `"@use-voltra/android-client"` to `app.json` to register widgets, optional notifications, and build-time initial states.

## Documentation

The documentation is available at [use-voltra.dev](https://use-voltra.dev). Relevant topics for this package:

- [Installation](https://use-voltra.dev/getting-started/installation)
- [Android Setup](https://use-voltra.dev/android/setup)
- [Developing Widgets](https://use-voltra.dev/android/development/developing-widgets)
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
      backgroundImage: 'linear-gradient(to bottom right, #E0F2FE 0%, #C7D2FE 100%)',
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

`backgroundImage` is the supported Android style key for gradients. The CSS key `background-image` is ignored, and `backgroundColor` remains the fallback if a gradient is invalid or cannot be rendered.

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
