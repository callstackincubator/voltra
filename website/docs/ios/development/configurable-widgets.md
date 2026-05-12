# Configurable widgets

Configurable widgets let users personalise what a widget shows directly from the iOS home screen — without opening your app. Long-pressing a widget and tapping "Edit Widget" reveals a native sheet where users can change values you define: pick a category from a list, toggle a flag, adjust a number. Voltra stores those choices and makes them available to your React Native code via `getWidgetParameters()`.

:::note
Configurable widgets require iOS 17+ and the widget extension deployment target set to `17.0` or higher (the Voltra plugin default).
:::

## How it works

1. You declare `parameters` on a widget in the Voltra plugin config.
2. Voltra generates the required native Swift types (`AppIntentConfiguration`, `WidgetConfigurationIntent`, `AppEnum`) at prebuild time.
3. When the user edits the widget, iOS presents the generated controls. On save, WidgetKit calls the widget's timeline provider with the new values.
4. The provider stores the values to the shared App Group so your React Native code can read them.
5. Next time your app is foregrounded, call `getWidgetParameters()` and re-render the widget with `updateWidget()`.

For **server-driven widgets**, step 5 is handled automatically: parameter values are appended as query parameters on every server fetch, so your server can return personalised content with no app interaction required.

## Plugin configuration

Add a `parameters` array to any widget in `app.json`:

```json
{
  "widgets": [
    {
      "id": "news",
      "displayName": "News Widget",
      "description": "Personalised news feed",
      "supportedFamilies": ["systemSmall", "systemMedium"],
      "initialStatePath": "./widgets/news-initial.tsx",
      "outdatedStatePath": "./widgets/news-outdated.tsx",
      "parameters": [
        {
          "id": "category",
          "type": "enum",
          "label": "Category",
          "cases": [
            { "value": "top", "label": "Top Stories" },
            { "value": "tech", "label": "Technology" },
            { "value": "sport", "label": "Sport" }
          ],
          "default": "top"
        },
        {
          "id": "showImages",
          "type": "bool",
          "label": "Show Images",
          "default": true
        }
      ]
    }
  ]
}
```

After changing plugin config, run `npx expo prebuild` and rebuild the app.

### Parameter types

| Type | iOS control | Notes |
|------|-------------|-------|
| `enum` | Picker | Cases are defined at build time. `value` is the stored string; `label` is shown to the user. |
| `bool` | Toggle | Stored as `"true"` or `"false"`. |
| `int` | Number input | Optional `min` / `max` bounds. Stored as a numeric string. |
| `double` | Number input | Stored as a numeric string. |

:::note
Free-form text input is not supported — iOS does not provide a text field in the widget edit sheet. Use `enum` for predefined choices.
:::

### `outdatedStatePath`

When a user changes parameters on a non-server widget, the widget cannot re-render itself — it needs the React Native app to call `updateWidget()` with the new values. Until that happens, `outdatedStatePath` lets you show a purpose-built holding state (e.g. "Open the app to apply your changes") instead of silently displaying stale content.

```json
{
  "id": "news",
  "outdatedStatePath": "./widgets/news-outdated.tsx",
  "parameters": [...]
}
```

The file follows the same format as `initialStatePath`. See [Widget pre-rendering](./widget-pre-rendering) for details.

:::tip
For server-driven widgets, `outdatedStatePath` is not needed — the server fetch happens automatically with the new parameter values.
:::

## Reading parameters in React Native

Call `getWidgetParameters()` when the app becomes active to pick up any changes the user made from the home screen:

```tsx
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { getWidgetParameters, updateWidget } from 'voltra/client'

function WidgetScreen() {
  useFocusEffect(
    useCallback(() => {
      const params = getWidgetParameters('news')
      // params: { category: 'tech', showImages: 'true' }

      const category = params.category ?? 'top'
      const showImages = params.showImages === 'true'

      updateWidget('news', {
        systemSmall: <NewsWidget category={category} showImages={showImages} />,
        systemMedium: <NewsWidget category={category} showImages={showImages} />,
      })
    }, [])
  )
}
```

All values are returned as strings regardless of the original parameter type. Cast them as needed:

| Parameter type | Stored value | How to read |
|----------------|-------------|-------------|
| `enum` | The `value` string (e.g. `"tech"`) | Use directly |
| `bool` | `"true"` or `"false"` | `params.flag === 'true'` |
| `int` | Numeric string (e.g. `"5"`) | `parseInt(params.count, 10)` |
| `double` | Numeric string (e.g. `"3.14"`) | `parseFloat(params.value)` |

`getWidgetParameters()` returns an empty object if the widget has not been placed or the user has never edited it. In that case, fall back to your defaults.

:::note
`getWidgetParameters()` is synchronous and reads from the shared App Group UserDefaults. It is iOS-only and returns `{}` on other platforms.
:::

## Server-driven widgets

When a widget has both `parameters` and `serverUpdate` configured, Voltra automatically appends the current parameter values as query parameters on every server fetch:

```
GET https://api.example.com/widgets/render
  ?widgetId=news
  &platform=ios
  &family=systemSmall
  &theme=dark
  &category=tech
  &showImages=true
```

Your server reads them from the request and returns personalised content:

```tsx
import { createWidgetUpdateHandler } from 'voltra/server'

export const GET = createWidgetUpdateHandler({
  renderIos: async (req) => {
    const category = req.query.category ?? 'top'
    const showImages = req.query.showImages === 'true'

    const articles = await fetchArticles({ category })

    return {
      systemSmall: <NewsWidget articles={articles} showImages={showImages} />,
      systemMedium: <NewsWidget articles={articles} showImages={showImages} />,
    }
  },
})
```

The widget updates immediately when the user saves new parameter values — no app interaction required.
