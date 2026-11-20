---
title: "Dynamic colors"
description: "Use AndroidDynamicColors semantic tokens so widgets follow the Material palette and wallpaper changes without a JavaScript re-render."
---

Voltra supports Android dynamic colors through semantic tokens exposed from `@use-voltra/android`.

Each token names a color role, such as `primary` or `surface`, and resolves through the widget's theme. By default that is the Material You palette on Android 12 and later, so widgets pick up wallpaper and light or dark changes without waiting for JavaScript to run again. A Dynamic Widget can also bring [its own theme](#theming-a-dynamic-widget).

## Importing dynamic colors

```tsx
import { AndroidDynamicColors, VoltraAndroid } from '@use-voltra/android'
```

`AndroidDynamicColors` includes these roles:

- `primary`
- `onPrimary`
- `primaryContainer`
- `onPrimaryContainer`
- `secondary`
- `onSecondary`
- `secondaryContainer`
- `onSecondaryContainer`
- `tertiary`
- `onTertiary`
- `tertiaryContainer`
- `onTertiaryContainer`
- `error`
- `errorContainer`
- `onError`
- `onErrorContainer`
- `background`
- `onBackground`
- `surface`
- `onSurface`
- `surfaceVariant`
- `onSurfaceVariant`
- `outline`
- `inverseOnSurface`
- `inverseSurface`
- `inversePrimary`
- `widgetBackground`

## Example

```tsx
import { AndroidDynamicColors, VoltraAndroid } from '@use-voltra/android'

export function WeatherWidget() {
  return (
    <VoltraAndroid.Box
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: AndroidDynamicColors.widgetBackground,
        padding: 16,
      }}
    >
      <VoltraAndroid.Column>
        <VoltraAndroid.Text
          style={{
            color: AndroidDynamicColors.onSurface,
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          21°
        </VoltraAndroid.Text>

        <VoltraAndroid.FilledButton
          text="Refresh"
          backgroundColor={AndroidDynamicColors.primary}
          contentColor={AndroidDynamicColors.onPrimary}
        />
      </VoltraAndroid.Column>
    </VoltraAndroid.Box>
  )
}
```

## Where you can use them

You can use `AndroidDynamicColors.*` anywhere Android accepts a color value, including:

- `style.backgroundColor`
- `style.color`
- `Image.colorFilter`
- button `backgroundColor` and `contentColor`
- `TitleBar.textColor` and `TitleBar.iconColor`
- switch, checkbox, and radio button colors
- progress indicator colors
- chart mark colors

## Theming a Dynamic Widget

Android 11 and older have no system dynamic palette, so tokens there resolve to Glance's fixed Material baseline colors. A [Dynamic Widget](/android/development/dynamic-widgets) can choose the colors its tokens resolve to by exporting a named `theme` next to its default export:

```tsx
import { AndroidDynamicColors, VoltraAndroid, type AndroidWidgetTheme } from '@use-voltra/android'

export const theme: AndroidWidgetTheme = {
  day: { primary: '#E65100', surface: '#FFF3E0', onSurface: '#3E2723' },
  night: { primary: '#FFB74D', surface: '#3E2723', onSurface: '#FFF3E0' },
}

export default function OrderWidget() {
  return (
    <VoltraAndroid.Column style={{ width: '100%', height: '100%', backgroundColor: AndroidDynamicColors.surface }}>
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurface }}>Order #1042</VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.primary }}>Out for delivery</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}
```

The widget keeps using the same `AndroidDynamicColors.*` tokens; the theme only changes what they resolve to.

- The keys of `day` and `night` are the role names [listed above](#importing-dynamic-colors).
- Values are literal colors: hex, `rgb()`/`rgba()`, `hsl()`/`hsla()` or color names. Tokens and `{ day, night }` pairs are not allowed inside a theme.
- A role is themed only when it has a color on both sides. Roles you leave out keep the colors they would have without a theme.
- Android picks the `day` or `night` side to match the system's light or dark setting, as it does for a [`{ day, night }` pair](/android/development/styling#day-and-night-colors).
- An invalid theme or role is skipped with a warning in Logcat under the `DynamicWidgetTheme` tag, so the widget still renders.

### Theme or system palette

On Android 12 and later the system palette wins by default, and the theme only fills in on older versions. Set `dynamicColors: false` to use the theme on every version:

```tsx
export const theme: AndroidWidgetTheme = {
  day: { primary: '#E65100', surface: '#FFF3E0' },
  night: { primary: '#FFB74D', surface: '#3E2723' },
  dynamicColors: false,
}
```

| Situation | Android 12+ | Android 11 and older |
| --- | --- | --- |
| No `theme` export | System palette | Material baseline colors |
| `theme`, `dynamicColors` omitted or `true` | System palette | Theme, then baseline colors |
| `theme`, `dynamicColors: false` | Theme, then system palette | Theme, then baseline colors |

Literal colors and `{ day, night }` pairs on styles and props are always used as written. Only tokens go through the theme.

### Limitations

- The pre-rendered `initialStatePath` view ignores the theme. Use `{ day, night }` pairs there if its colors matter.
- Only Dynamic Widgets read `theme`. Payload-driven widgets, including server-rendered ones, keep using the default palette.

## Server-driven widgets

Dynamic color tokens work in server-rendered Android widgets too.

```tsx
import { AndroidDynamicColors, VoltraAndroid } from '@use-voltra/android'

const content = (
  <VoltraAndroid.Box
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: AndroidDynamicColors.surface,
      padding: 16,
    }}
  >
    <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurface }}>
      Server-rendered widget
    </VoltraAndroid.Text>
  </VoltraAndroid.Box>
)
```

The same `AndroidDynamicColors.*` values work whether the widget is rendered in-app or returned from your server.
