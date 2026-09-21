# Dynamic colors

Voltra supports Android dynamic colors through semantic tokens exposed from `voltra/android`.

These colors follow the current Android Material palette, so widgets can pick up wallpaper and theme changes without waiting for JavaScript to run again.

## Importing dynamic colors

```tsx
import { AndroidDynamicColors, VoltraAndroid } from 'voltra/android'
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
import { AndroidDynamicColors, VoltraAndroid } from 'voltra/android'

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
- `Image.tintColor`
- button `backgroundColor` and `contentColor`
- `TitleBar.textColor` and `TitleBar.iconColor`
- switch, checkbox, and radio button colors
- progress indicator colors
- chart mark colors

## Server-driven widgets

Dynamic color tokens work in server-rendered Android widgets too.

```tsx
import { AndroidDynamicColors, VoltraAndroid } from 'voltra/android'

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

## Migration notes

Voltra no longer uses the old Android dynamic palette snapshot approach.

- Use `AndroidDynamicColors.*` for Android widgets that should react to system palette changes.
- Keep using literal colors when you want a fixed color.
- There is no `useAndroidDynamicColorPalette()` or `getAndroidDynamicColorPalette()` API anymore.
