# Localisation

Dynamic Widgets and Dynamic Live Activities run their JavaScript on the device every time they render, so the same code that draws the widget can also translate it and format dates, numbers and units for the user. Voltra gives the entry everything it needs through the environment, and re-renders when it changes.

Two surfaces are drawn by iOS itself rather than by your JavaScript: the widget gallery and the Edit Widget sheet. Their copy is translated at build time from locale maps in `app.json`.

## The locale environment

Every render receives these fields on `env` (Dynamic Widgets) and on the Live Activity `environment`:

| Field                | Example                    | Notes                                                                                                                                                      |
| -------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`             | `"pl-PL"`, `"en-US-u-hc-h23"` | BCP-47 tag of the locale the widget extension resolved, including Unicode extensions for the user's overrides. Pass it to every `Intl` and `toLocale*` call. |
| `preferredLanguages` | `["pl-PL", "en-US"]`       | The user's ordered language list, independent of which languages the app supports.                                                                         |
| `appLocale`          | `"pl"`                     | The language the app chose with `setDynamicWidgetLocale`. Absent unless set.                                                                               |
| `layoutDirection`    | `"ltr"`                    | `"rtl"` for Arabic, Hebrew and other right-to-left languages.                                                                                               |
| `hourCycle`          | `"h23"`                    | The effective clock, already reconciled with the user's 24-Hour Time setting.                                                                               |
| `timeZone`           | `"Europe/Warsaw"`          | The device's IANA time zone.                                                                                                                               |
| `measurementSystem`  | `"metric"`                 | `"metric"`, `"us"` or `"uk"`.                                                                                                                              |
| `calendar`           | `"gregory"`                | Unicode calendar identifier as `Intl` spells it.                                                                                                           |
| `firstDayOfWeek`     | `2`                        | `1` is Sunday, `2` is Monday, … `7` is Saturday.                                                                                                            |

WidgetKit reloads widgets by itself when the system language changes, so a widget that reads these fields at render time always shows the current language. There is nothing to wire up.

:::info `env.locale` is a BCP-47 tag
Before this release iOS passed the ICU form (`pl_PL`), which `Intl` rejects with a `RangeError`. If your widget parsed the underscore form, switch to the hyphenated one.
:::

## Translating widget content

Keep one messages object per language and let `resolveLocale` pick one. It tries the app's override first, then the user's preferred languages (exact tag, then language), then `env.locale`, and finally falls back to `en`, `__default`, or the first key.

```tsx
import { resolveLocale, Voltra, type WidgetEnvironment } from '@use-voltra/ios'

const messages = {
  en: { title: 'Next train', minutes: (n: number) => `in ${n} min` },
  pl: { title: 'Następny pociąg', minutes: (n: number) => `za ${n} min` },
}

export default function TrainWidget(props: { departure?: number }, env: WidgetEnvironment) {
  const t = messages[resolveLocale(env, messages) ?? 'en']
  const departure = new Date(props.departure ?? env.date.valueOf())

  const time = new Intl.DateTimeFormat(env.locale, {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: env.hourCycle,
    timeZone: env.timeZone,
  }).format(departure)

  return (
    <Voltra.VStack alignment="leading">
      <Voltra.Text>{t.title}</Voltra.Text>
      <Voltra.Text>{time}</Voltra.Text>
    </Voltra.VStack>
  )
}
```

Always pass `env.locale` (and `env.timeZone` for dates) explicitly. A call without a locale uses the JavaScript runtime's default, which comes from the device's language list rather than from the language the widget is drawn in, so the two can disagree.

Stacks mirror by themselves in right-to-left languages (`leading` is the right edge there); use `env.layoutDirection` for anything you position by hand, such as the direction of an arrow symbol.

JavaScriptCore on iOS supports the whole `Intl` API — `PluralRules`, `RelativeTimeFormat`, `ListFormat`, `DisplayNames` and `DateTimeFormat` with `dateStyle`/`timeStyle` — so no polyfills are needed on iOS.

`pickLocalizedValue(map, languages)` applies the same fallback to any locale-keyed map if you prefer to pass the language list yourself.

## Letting the app choose the language

iOS 17 and 18 do not pass a per-app language chosen in Settings to widget extensions, and apps with their own in-app language picker have no other way to reach them. Tell Voltra which language to use instead:

```ts
import { setDynamicWidgetLocale } from '@use-voltra/ios-client'

await setDynamicWidgetLocale('pl') // every render now sees env.appLocale === 'pl'
await setDynamicWidgetLocale(null) // back to the system languages
```

The tag is stored in the App Group, so this requires `groupIdentifier` in the plugin configuration and rejects without one. Widgets reload as soon as the value is stored; Dynamic Live Activities pick it up on their next update. `resolveLocale` gives `appLocale` precedence automatically.

## Declaring the app's languages

iOS decides which language the widget extension runs in from the languages the extension itself declares. Voltra mirrors your app's languages into the generated extension so `env.locale` resolves the way it does in the app: it writes `CFBundleLocalizations` into the extension's `Info.plist` and adds a `<language>.lproj/Localizable.strings` for each one.

The list is built from:

- the keys of the Expo [`locales`](https://docs.expo.dev/guides/localization/#translating-app-metadata) config,
- `ios.infoPlist.CFBundleLocalizations`, if you set it,
- every locale used in a widget's locale maps (gallery labels and Edit Widget sheet copy),
- plus `en`, where Voltra's English fallback strings live.

Declare every language your widgets translate into, for example with `"locales": { "pl": "./locales/pl.json" }`. Without a Polish entry, a Polish user of your app gets `env.locale === "en-PL"`; `env.preferredLanguages` still lists Polish first.

## Gallery and Edit Widget sheet copy

The widget gallery name and description, and the titles on the Edit Widget sheet, accept locale maps in `app.json`:

```json
{
  "id": "weather",
  "entry": "./widgets/ios/weather.tsx",
  "displayName": { "en": "Weather", "pl": "Pogoda" },
  "description": { "en": "Current conditions", "pl": "Aktualne warunki" },
  "configurationTitle": { "en": "Weather settings", "pl": "Ustawienia pogody" },
  "appIntent": {
    "parameters": [
      {
        "name": "units",
        "title": { "en": "Units", "pl": "Jednostki" },
        "default": "metric",
        "options": [
          { "value": "metric", "title": { "en": "Metric", "pl": "Metryczne" } },
          { "value": "imperial", "title": { "en": "Imperial", "pl": "Imperialne" } }
        ]
      }
    ]
  }
}
```

These surfaces are drawn by iOS in the system language, not in the app's language, and they never run your JavaScript. See [Configurable Widgets](./configurable-widgets) for `options` and `configurationTitle`.

## Live Activity push alerts

The `alert` of an ActivityKit push is shown by iOS and is not rendered by Voltra. Localise it with the APNs `title-loc-key`/`loc-key` fields and strings in the app bundle.
