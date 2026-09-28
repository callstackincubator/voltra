# Localisation

A Dynamic Widget renders on the device, so your JavaScript can translate the widget and format dates, numbers and units for the person looking at it. Every render receives the language and regional settings on `env`, and placed widgets render again when those settings change.

## What the widget knows about the user

| Field                | Example              | What it tells you                                                                                                  |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `locale`             | `"pl-PL"`            | The language and region the widget is drawn in, as a BCP-47 tag. Pass it to every `Intl` and `toLocale*` call.    |
| `preferredLanguages` | `["pl-PL", "en-US"]` | The user's languages in order. A per-app language (Android 13 and newer) comes first, then the system languages.  |
| `appLocale`          | `"pl"`               | The language your app chose with `setDynamicWidgetLocale`. Absent unless you set one.                             |
| `layoutDirection`    | `"ltr"`              | `"rtl"` for Arabic, Hebrew and other right-to-left languages.                                                      |
| `hourCycle`          | `"h23"`              | `"h12"` or `"h23"`, matching the user's 24-hour time setting. This setting is not part of `locale`.               |
| `timeZone`           | `"Europe/Warsaw"`    | The device time zone.                                                                                              |
| `measurementSystem`  | `"metric"`           | `"metric"`, `"us"` or `"uk"`. Absent on Android 8 and older.                                                       |
| `calendar`           | `"gregory"`          | The user's calendar, spelled the way `Intl` expects.                                                               |
| `firstDayOfWeek`     | `2`                  | `1` is Sunday, `2` is Monday, up to `7` for Saturday.                                                              |

Placed widgets render again after the device language, the app's per-app language or the regional preferences change, even when the app is not running. A language change your app makes while it is running takes effect at once. An app the user force-stopped in Settings receives no broadcasts, so its widgets update the next time the app runs.

## Translate widget content

Keep one messages object per language and let `resolveLocale` choose. It tries `appLocale`, then each entry of `preferredLanguages` (exact tag, then language only), then `locale`. If none match, it returns `en`, then `__default`, then the first key. It returns `undefined` only when the object is empty.

```tsx
import { resolveLocale, VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

const messages = {
  en: { title: 'Next train' },
  pl: { title: 'Następny pociąg' },
}

export default function TrainWidget(props: { departure?: number }, env: WidgetEnvironment) {
  const t = messages[resolveLocale(env, messages) ?? 'en']

  const time = new Intl.DateTimeFormat(env.locale, {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: env.hourCycle,
    timeZone: env.timeZone,
  }).format(new Date(props.departure ?? env.date.valueOf()))

  return (
    <VoltraAndroid.Column>
      <VoltraAndroid.Text>{t.title}</VoltraAndroid.Text>
      <VoltraAndroid.Text>{time}</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}
```

`pickLocalizedValue(map, languages)` applies the same fallback to any locale-keyed map when you want to pass the language list yourself.

## Format dates, numbers and units

Pass `env.locale` to every `Intl` and `toLocale*` call, `env.timeZone` whenever you format a date, and `env.hourCycle` whenever you format a time. The user's 24-hour setting is separate from the locale on Android, so `Intl` only honours it when you pass `hourCycle`.

Use `env.measurementSystem` to choose between kilometres and miles, or Celsius and Fahrenheit, and `env.firstDayOfWeek` when you draw a week.

### Intl support on Android

Android widgets have `Intl.Collator`, `Intl.NumberFormat`, `Intl.DateTimeFormat` and the `toLocale*` methods. They do not have `Intl.PluralRules`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`, `Intl.DisplayNames` or `Intl.Locale`. Calling one of those throws, and i18n libraries that rely on plural rules (i18next 21 and newer, FormatJS) fail without them.

To use them, add the [FormatJS](https://formatjs.github.io/docs/polyfills) polyfills to Android widget bundles. Install the packages in the app:

```sh
npm install @formatjs/intl-getcanonicallocales @formatjs/intl-locale @formatjs/intl-pluralrules \
  @formatjs/intl-listformat @formatjs/intl-displaynames @formatjs/intl-relativetimeformat
```

Then list the languages your widgets render in:

```js title="metro.config.js"
const { getDefaultConfig } = require('expo/metro-config')
const { withVoltra } = require('@use-voltra/metro')

module.exports = withVoltra(getDefaultConfig(__dirname), {
  androidIntlPolyfills: { locales: ['en', 'pl', 'de'] },
})
```

Locale data is loaded per language, so `pt-BR` and `pt-PT` both load `pt`. Each language adds to the Android bundle size, so list only the ones you translate into. iOS bundles are not changed. If a package is missing, Metro fails at startup with a message naming the packages to install.

## Let the app choose the language

On Android 13 and newer, a per-app language the user picks in Settings already reaches widgets as `env.locale`. If your app has its own language picker, pass its choice to widgets:

```ts
import { setDynamicWidgetLocale } from '@use-voltra/android-client'

await setDynamicWidgetLocale('pl') // every render now sees env.appLocale === 'pl'
await setDynamicWidgetLocale(null) // back to the system languages
```

Every placed Dynamic Widget renders again as soon as the value is stored, and the value survives app restarts. `resolveLocale` prefers `appLocale` over everything else. The override changes the translation only: `locale`, `layoutDirection`, `hourCycle` and the other formatting fields keep following the system, because the launcher mirrors stacks by the system direction, not by your app's language. If you translate into a right-to-left language while the system runs left-to-right, position hand-placed content by `env.layoutDirection`, not by the language you chose.

## Translate the picker and configuration copy

The widget picker name and description accept locale maps; see [Localizing `displayName` and `description`](../api/plugin-configuration#localizing-displayname-and-description).

`appIntent.parameters[].title` and `options[].title` accept locale maps too. Android has no system screen that shows them, so Voltra stores them as string resources for a configuration screen you build in the app. Read them with `getString` by name:

| Copy                         | Resource name                                         |
| ---------------------------- | ----------------------------------------------------- |
| a parameter's `title`        | `voltra_widget_<id>_param_<name>_title`               |
| an option's `title`          | `voltra_widget_<id>_param_<name>_option_<value>`      |

`<id>`, `<name>` and `<value>` are lower-cased, and anything other than letters, digits and underscores becomes `_`. Rebuild the native app after changing them.
