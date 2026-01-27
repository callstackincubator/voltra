# Developing Android Widgets

Voltra allows you to build Android Home Screen widgets using JSX and Jetpack Compose Glance primitives.

## Glance Primitives

On Android, you use `VoltraAndroid` components which map to Glance primitives:

- **Column:** Vertical layout
- **Row:** Horizontal layout
- **Box:** Stacked layout
- **Spacer:** Flexible spacing
- **Text:** Displaying text
- **Image:** Displaying images
- **Scaffold:** Top-level container

### Example Widget

```tsx
import { VoltraAndroid } from 'voltra'

const WeatherWidget = ({ temperature, condition }) => (
  <VoltraAndroid.Box
    style={{
      padding: 16,
      backgroundColor: '#f0f0f0',
      borderRadius: 12,
      width: '100%',
      height: '100%'
    }}
  >
    <VoltraAndroid.Column>
      <VoltraAndroid.Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        {temperature}°C
      </VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: '#666' }}>
        {condition}
      </VoltraAndroid.Text>
    </VoltraAndroid.Column>
  </VoltraAndroid.Box>
)
```

## Update API

To update a widget's content, use the `updateWidget` function from `voltra/client`:

```typescript
import { updateWidget } from 'voltra/client'

await updateWidget('weather_widget', <WeatherWidget temperature={22} condition="Sunny" />)
```

## Layout Constraints

Unlike standard React Native or iOS Stacks, Android Glance layouts are more restrictive:
- **Width/Height:** Use fixed numbers (dp), `"100%"` to fill available space, or `"auto"` to wrap content.
- **Modifiers:** Most styling is handled via the `style` prop, which maps to Glance `Modifier`s. See [Styling](./styling) for full details.
- **Alignment:** Use `verticalAlignment` and `horizontalAlignment` props on `Column` and `Row`.

## Advanced Features

- **[Testing and Previews](./testing-and-previews):** Preview layouts within your app.
- **[Widget Picker Previews](../api/plugin-configuration#widget-picker-previews):** Configure how your widget appears in the Android widget picker.
- **[Image Preloading](./image-preloading):** Cache remote images for use in widgets.
- **[Widget Pre-rendering](./widget-pre-rendering):** Provide initial state for widgets before the app first runs.

## Widget Picker Previews

When users browse the widget picker to add your widget to their home screen, they see a preview. You can customize this preview using:

- **`previewImage`:** Static image (PNG/JPG/WebP) that shows in the picker on all Android versions
- **`previewLayout`:** Custom XML layout that renders a scalable preview on Android 12+

See [Plugin Configuration - Widget Picker Previews](../api/plugin-configuration#widget-picker-previews) for configuration details and examples.
