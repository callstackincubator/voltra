# Localisation

A Dynamic Widget or Dynamic Live Activity renders on the device, so your JavaScript can translate the widget and format dates, numbers and units for the person looking at it. Every render receives the language and regional settings on `env`, and widgets render again when those settings change.

Two parts of a widget are drawn by iOS, not by your code: the widget gallery and the Edit Widget sheet. You translate those in `app.json`; see [Translate the gallery and the Edit Widget sheet](#translate-the-gallery-and-the-edit-widget-sheet).

## What the widget knows about the user

These fields are on `env` in a Dynamic Widget and on `environment` in a Dynamic Live Activity:

| Field                | Example                       | What it tells you                                                                                                                                         |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`             | `"pl-PL"`, `"en-US-u-hc-h23"` | The language and region the widget is drawn in, as a BCP-47 tag. It includes the user's overrides, such as 24-Hour Time. Pass it to every `Intl` and `toLocale*` call. |
| `preferredLanguages` | `["pl-PL", "en-US"]`          | The user's language list from Settings, in order, whether or not your app supports those languages.                                                     |
| `appLocale`          | `"pl"`                        | The language your app chose with `setDynamicWidgetLocale`. Absent unless you set one.                                                                    |
| `layoutDirection`    | `"ltr"`                       | `"rtl"` for Arabic, Hebrew and other right-to-left languages.                                                                                             |
| `hourCycle`          | `"h23"`                       | `"h12"` or `"h23"`, matching the user's 24-Hour Time setting.                                                                                             |
| `timeZone`           | `"Europe/Warsaw"`             | The device time zone.                                                                                                                                     |
| `measurementSystem`  | `"metric"`                    | `"metric"`, `"us"` or `"uk"`.                                                                                                                             |
| `calendar`           | `"gregory"`                   | The user's calendar, spelled the way `Intl` expects.                                                                                                      |
| `firstDayOfWeek`     | `2`                           | `1` is Sunday, `2` is Monday, up to `7` for Saturday.                                                                                                     |

`locale` follows the languages your app declares, not the device language on its own. A Polish user of an app that only declares English gets `"en-PL"`. See [Declare the languages your app supports](#declare-the-languages-your-app-supports).

Versions of `@use-voltra/ios-client` before 2.4.0 passed `locale` as `pl_PL`. If your widget compared it against that form, switch to the hyphenated tag.

## Translate widget content

Keep one messages object per language and let `resolveLocale` choose. It tries `appLocale`, then each entry of `preferredLanguages` (exact tag, then language only), then `locale`. If none match, it returns `en`, then `__default`, then the first key. It returns `undefined` only when the object is empty.

```tsx
import { resolveLocale, Voltra, type WidgetEnvironment } from '@use-voltra/ios'

const messages = {
  en: { title: 'Next train' },
  pl: { title: 'Następny pociąg' },
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

`pickLocalizedValue(map, languages)` applies the same fallback to any locale-keyed map when you want to pass the language list yourself.

## Format dates, numbers and units

Pass `env.locale` to every `Intl` and `toLocale*` call, and `env.timeZone` whenever you format a date. A call without a locale uses the device language list, which can differ from the language the widget is drawn in, so the widget text and its dates would disagree.

The full `Intl` API is available on iOS: `DateTimeFormat` with `dateStyle` and `timeStyle`, `NumberFormat`, `PluralRules`, `RelativeTimeFormat`, `ListFormat` and `DisplayNames`. You do not need polyfills.

Use `env.measurementSystem` to choose between kilometres and miles, or Celsius and Fahrenheit, and `env.firstDayOfWeek` when you draw a week.

## Support right-to-left languages

Stacks mirror on their own in right-to-left languages, so `leading` is the right edge there. Use `env.layoutDirection` for anything you position by hand, such as the direction of an arrow symbol.

## Let the app choose the language

Use this when your app has its own language picker, or when you need the per-app language from Settings to reach widgets on iOS 17 and 18, which do not pass it to widgets on their own.

Requires `groupIdentifier` in the plugin configuration. Without it the call rejects, because widgets cannot read the value.

The Language row under Settings > Apps > your app appears only when the device lists more than one language in Settings > General > Language & Region. Set `UIPrefersShowingLanguageSettings` to `true` in `ios.infoPlist` to show the row on every device.

```ts
import { setDynamicWidgetLocale } from '@use-voltra/ios-client'

await setDynamicWidgetLocale('pl') // every render now sees env.appLocale === 'pl'
await setDynamicWidgetLocale(null) // back to the system languages
```

Widgets reload and running Dynamic Live Activities render again as soon as the value is stored. The value survives app restarts. `resolveLocale` prefers `appLocale` over everything else. The override changes the translation only: `locale`, `layoutDirection`, `hourCycle` and the other formatting fields keep following the system, because the launcher mirrors stacks by the system direction, not by your app's language. If you translate into a right-to-left language while the system runs left-to-right, position hand-placed content by `env.layoutDirection`, not by the language you chose.

## Declare the languages your app supports

iOS picks the widget's language from the languages the app declares. Voltra declares the same languages for widgets as for the app, taken from:

- the keys of the Expo [`locales`](https://docs.expo.dev/guides/localization/#translating-app-metadata) config,
- `ios.infoPlist.CFBundleLocalizations`, if you set it,
- every locale used in a widget's locale maps (gallery labels and Edit Widget sheet copy),
- your app's development language (`ios.infoPlist.CFBundleDevelopmentRegion`, otherwise `en`).

Declare every language your widgets translate into, for example with `"locales": { "pl": "./locales/pl.json" }`. If Polish is missing, a Polish user gets `env.locale === "en-PL"`, while `env.preferredLanguages` still lists Polish first. Rebuild the native app after changing the list.

## Translate the gallery and the Edit Widget sheet

The widget gallery name and description, and the titles on the Edit Widget sheet, accept locale maps in `app.json`:

```json
{
  "id": "weather",
  "entry": "./widgets/ios/weather.tsx",
  "displayName": { "en": "Weather", "pl": "Pogoda" },
  "description": { "en": "Current conditions", "pl": "Aktualne warunki" },
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

iOS shows these in the system language, not in your app's language, and `setDynamicWidgetLocale` does not affect them. A language with no translation for a string shows your development language instead. Rebuild the native app after changing them. The sheet header shows the widget's `displayName`, so the same locale map translates it. See [Configurable Widgets](./configurable-widgets) for `options`.

## Translate Live Activity alerts

The `alert` of an ActivityKit push is shown by iOS and is not rendered by Voltra. Localise it with the APNs `title-loc-key` and `loc-key` fields and strings in the app bundle.
