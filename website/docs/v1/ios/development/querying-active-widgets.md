# Querying Active Widgets

Voltra allows you to detect which widgets the user has currently placed on their Home Screen. This is useful for:

- Determining if you need to update a specific widget
- Showing a list of active widgets in your app settings
- Optimizing background updates by only targeting installed widgets

## getActiveWidgets API

The `getActiveWidgets` function returns a promise that resolves to an array of all active widget configurations for your app.

:::warning
There may be a slight delay in the data returned by this API. iOS caches widget configurations, and it might take a few moments for the system to reflect recent additions or removals of widgets on the Home Screen.
:::

```typescript
import { getActiveWidgets } from 'voltra/client'

async function checkWidgets() {
  const activeWidgets = await getActiveWidgets()

  console.log(`User has ${activeWidgets.length} widgets installed`)

  activeWidgets.forEach(widget => {
    console.log(`- Widget Name: ${widget.name}`)
    console.log(`  Family: ${widget.family}`)
    console.log(`  Kind: ${widget.kind}`)
  })
}
```

### WidgetInfo Object

Each object in the returned array contains:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The unique ID of the widget as defined in your Expo config plugin (e.g., `"weather"`). |
| `kind` | `string` | The internal identifier string used by iOS (e.g., `"Voltra_Widget_weather"`). |
| `family` | `WidgetFamily` | The size of the widget instance (e.g., `"systemSmall"`, `"systemMedium"`, etc.). |
