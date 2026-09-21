# Testing and Previews (Android)

Voltra provides multiple ways to preview your Android widgets:

1. **In-App Previews** - Preview layouts within your development app using `VoltraWidgetPreview`
2. **Widget Picker Previews** - Customize what users see in the Android widget picker when adding your widget

This page covers in-app previews for development. For widget picker previews, see [Plugin Configuration - Widget Picker Previews](../api/plugin-configuration#widget-picker-previews).

## VoltraWidgetPreview

The `VoltraWidgetPreview` component renders Voltra Android JSX content at the exact dimensions of standard Android widget sizes.

### Usage

```tsx
import { VoltraAndroid } from 'voltra/android'
import { VoltraWidgetPreview } from 'voltra/android/client'

export function MyWidgetPreview() {
  return (
    <VoltraWidgetPreview
      family="mediumWide"
      style={{ backgroundColor: '#f0f0f0', borderRadius: 16 }}
    >
      <VoltraAndroid.Column style={{ padding: 16 }}>
        <VoltraAndroid.Text style={{ fontSize: 20, fontWeight: 'bold' }}>
          My Awesome Widget
        </VoltraAndroid.Text>
        <VoltraAndroid.Text>
          This is how it looks on the home screen!
        </VoltraAndroid.Text>
      </VoltraAndroid.Column>
    </VoltraWidgetPreview>
  )
}
```

### Supported Families

Android widgets use responsive sizing. Voltra provides several standard families based on typical grid dimensions:

| Family | DP Dimensions | Typical Grid Size |
| :--- | :--- | :--- |
| `small` | 150 x 100 | 2x1 |
| `mediumSquare` | 200 x 200 | 2x2 |
| `mediumWide` | 250 x 150 | 3x2 |
| `mediumTall` | 150 x 250 | 2x3 |
| `large` | 300 x 200 | 4x2 |
| `extraLarge` | 350 x 300 | 4x4 |

## VoltraView (Android)

If you need more control or want to test custom dimensions, you can use the low-level `VoltraView` component.

```tsx
import { VoltraView } from 'voltra/android/client'

<VoltraView style={{ width: 200, height: 100 }}>
  <VoltraAndroid.Box style={{ backgroundColor: 'blue', flex: 1 }}>
    <VoltraAndroid.Text color="white">Custom Preview</VoltraAndroid.Text>
  </VoltraAndroid.Box>
</VoltraView>
```

## Accuracy

The Android preview components use the **actual native Glance renderers** under the hood. When you provide JSX to `VoltraWidgetPreview`, it is converted to a native `RemoteViews` object and rendered using the same logic that Android uses on the home screen.

This ensures that:
- Layout constraints are respected.
- Styling (colors, fonts, spacing) is accurate.
- Component mapping is identical to the production widget.

:::info
While layout and styling are accurate, some home-screen specific behaviors (like actual widget resizing by the user) are not simulated by the preview component.
:::
