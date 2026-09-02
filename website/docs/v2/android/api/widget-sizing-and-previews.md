# Widget Sizing & Previews (Android)

## Widget Sizing

### Grid Cells vs Density-Independent Pixels (dp)

Android widgets are sized two different ways depending on the OS version. Android 12+ places
widgets using `targetCellWidth`/`targetCellHeight`, in grid cells. Android 11 and older don't
understand those attributes at all and place widgets using `minWidth`/`minHeight`, in dp, so Voltra
always emits both.

When `minWidth`/`minHeight` aren't set explicitly, they're derived from the widget's cell size using
Google's published figures for a 5x4 handset grid:

- **minWidth (dp) = (cellCount × 73) - 16**
- **minHeight (dp) = (cellCount × 66) - 15**

For example, 2 cells comes out to 130 dp wide and 117 dp tall, and 4 cells to 276 dp wide and 249 dp
tall.

Cell size varies by device, launcher and orientation, so this conversion is only an approximation,
and it only matters on Android 11 and older — Android 12+ sizes the widget from `targetCellWidth`/
`targetCellHeight` directly. If you need precise placement on Android 11 and older, set `minWidth`
and `minHeight` explicitly in dp instead of relying on the conversion.

### Standard Dimensions

| Family | Cells | Default DP | Typical Use |
|--------|-------|-----------|-------------|
| Small | 2×1 | 130 × 51 | Quick glance info |
| Medium | 2×2 | 130 × 117 | Main widget size |
| Large | 4×2 | 276 × 117 | Rich content |
| Extra Large | 4×4 | 276 × 249 | Complex layouts |

## Widget Picker Previews

When users add a widget to their home screen, Android displays a preview in the widget picker. Voltra supports three preview methods, with automatic fallback:

1. **`previewLayout`** (Android 12+) - Custom XML layout for scalable preview
2. **`previewImage`** (All versions) - Static image or auto-generated layout
3. **Default** - System placeholder layout

### Using `previewImage`

Static preview image for all Android versions:

```json
{
  "widgets": [
    {
      "id": "weather",
      "displayName": "Weather Widget",
      "targetCellWidth": 2,
      "targetCellHeight": 2,
      "previewImage": "./assets/widgets/weather-preview.png"
    }
  ]
}
```

When only `previewImage` is specified, Voltra automatically generates a layout that displays the image with proper scaling.

### Using `previewLayout`

Custom XML layout for scalable previews (Android 12+):

```json
{
  "widgets": [
    {
      "id": "todos",
      "displayName": "Todo Widget",
      "targetCellWidth": 2,
      "targetCellHeight": 2,
      "previewLayout": "./assets/widgets/todos-preview.xml"
    }
  ]
}
```

**Example `todos-preview.xml`:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="#FFFFFF">

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Todo List"
        android:textSize="18sp"
        android:textStyle="bold" />

    <!-- Add more layout elements here -->

</LinearLayout>
```

The preview layout is rendered at the widget's target size and displayed in the widget picker.

### Combined Preview Setup

For best results across Android versions, provide both:

```json
{
  "widgets": [
    {
      "id": "weather",
      "displayName": "Weather Widget",
      "targetCellWidth": 2,
      "targetCellHeight": 2,
      "previewImage": "./assets/widgets/weather-preview.png",
      "previewLayout": "./assets/widgets/weather-preview.xml",
      "initialStatePath": "./widgets/weather-initial.tsx"
    }
  ]
}
```

This uses `previewLayout` on Android 12+, falls back to `previewImage` on Android 11 and earlier, and shows actual widget content on the home screen via `initialStatePath` once available.
