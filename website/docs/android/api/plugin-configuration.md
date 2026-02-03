# Plugin Configuration (Android)

The Voltra Expo config plugin accepts Android-specific configuration options in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "groupIdentifier": "group.your.bundle.identifier",
          "android": {
            "widgets": [
              {
                "id": "weather",
                "displayName": "Weather Widget",
                "description": "Shows current weather conditions",
                "targetCellWidth": 2,
                "targetCellHeight": 2,
                "initialStatePath": "./widgets/weather-initial.tsx",
                "previewImage": "./assets/widgets/weather-preview.png"
              }
            ]
          }
        }
      ]
    ]
  }
}
```

## Android-Specific Configuration

### `android.widgets` (optional)

Array of widget configurations for Home Screen widgets. Each widget will be available in the Android widget picker.

**Widget Configuration Properties:**

- `id`: Unique identifier for the widget (alphanumeric with underscores only)
- `displayName`: Name shown in the widget picker
- `description`: Description shown in the widget picker
- `targetCellWidth`: Target widget width in grid cells (1-5, required)
- `targetCellHeight`: Target widget height in grid cells (1-5, required)
- `minCellWidth`: (optional) Minimum width in grid cells (defaults to targetCellWidth)
- `minCellHeight`: (optional) Minimum height in grid cells (defaults to targetCellHeight)
- `minWidth`: (optional) Minimum width in dp (overrides minCellWidth calculation)
- `minHeight`: (optional) Minimum height in dp (overrides minCellHeight calculation)
- `resizeMode`: (optional) Widget resize behavior (`"none"` | `"horizontal"` | `"vertical"` | `"horizontal|vertical"`, default: `"horizontal|vertical"`)
- `widgetCategory`: (optional) Widget category (`"home_screen"` | `"keyguard"` | `"home_screen|keyguard"`, default: `"home_screen"`)
- `initialStatePath`: (optional) Path to a file that exports initial widget state (see [Widget Pre-rendering](../development/widget-pre-rendering))
- `previewImage`: (optional) Path to preview image for widget picker (PNG/JPG/WebP)
- `previewLayout`: (optional) Path to custom XML layout for widget picker preview (Android 12+)

## Widget Sizing

### Grid Cells vs Density-Independent Pixels (dp)

Android uses grid cells to define widget sizes. By default, the formula is:
- **minWidth/minHeight (dp) = (cellCount × 70) - 30**

**Example:**
- 2 cells = (2 × 70) - 30 = **110 dp**
- 4 cells = (4 × 70) - 30 = **250 dp**

You can override this with explicit `minWidth` and `minHeight` in dp.

### Standard Dimensions

| Family | Cells | Default DP | Typical Use |
|--------|-------|-----------|-------------|
| Small | 2×1 | 110 × 40 | Quick glance info |
| Medium | 2×2 | 110 × 110 | Main widget size |
| Large | 4×2 | 250 × 110 | Rich content |
| Extra Large | 4×4 | 250 × 250 | Complex layouts |

## Widget Picker Previews

When users add a widget to their home screen, Android displays a preview in the widget picker. Voltra supports three preview methods, with automatic fallback:

### Preview Priority Chain

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

For best results across Android versions:

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

This configuration:
- Uses `previewLayout` on Android 12+ (scalable, accurate preview)
- Falls back to `previewImage` on Android 11 and earlier
- Shows actual widget content on home screen via `initialStatePath` (when available)

## Widget Pre-rendering

Use `initialStatePath` to provide pre-rendered widget state:

```json
{
  "widgets": [
    {
      "id": "weather",
      "displayName": "Weather Widget",
      "targetCellWidth": 2,
      "targetCellHeight": 2,
      "initialStatePath": "./widgets/weather-initial.tsx"
    }
  ]
}
```

When the app is built, Voltra pre-renders the widget at the specified path and bundles it as `voltra_initial_states.json`. The widget displays this content immediately when first added to the home screen, before any dynamic updates.

See [Widget Pre-rendering](../development/widget-pre-rendering) for details on creating initial state files.

## Example Configuration

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "groupIdentifier": "group.com.example.app",
          "android": {
            "widgets": [
              {
                "id": "voltra",
                "displayName": "Voltra Widget",
                "description": "Voltra logo widget",
                "minCellWidth": 2,
                "minCellHeight": 2,
                "targetCellWidth": 2,
                "targetCellHeight": 2,
                "resizeMode": "horizontal|vertical",
                "widgetCategory": "home_screen",
                "initialStatePath": "./widgets/android-voltra-widget-initial.tsx",
                "previewImage": "./assets/voltra-icon.jpg"
              },
              {
                "id": "interactive_todos",
                "displayName": "Interactive Todos",
                "description": "Quick todo list widget",
                "targetCellWidth": 2,
                "targetCellHeight": 2,
                "previewLayout": "./assets/widgets/todos-preview.xml"
              }
            ]
          }
        }
      ]
    ]
  }
}
```
