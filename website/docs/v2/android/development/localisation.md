# Localisation

Dynamic Widgets run their JavaScript in Hermes every time they render, so the same code that draws the widget can also translate it and format dates, numbers and units for the user. Voltra gives the entry everything it needs through `env`, and re-renders placed widgets when the language changes.

## The locale environment

| Field                | Example              | Notes                                                                                                         |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `locale`             | `"pl-PL"`            | BCP-47 tag of the first configured locale. Pass it to every `Intl` and `toLocale*` call.                     |
| `preferredLanguages` | `["pl-PL", "en-US"]` | Every configured locale in order: a per-app language (Android 13+) first, then the system languages.         |
| `appLocale`          | `"pl"`               | The language the app chose with `setDynamicWidgetLocale`. Absent unless set.                                 |
| `layoutDirection`    | `"ltr"`              | `"rtl"` for Arabic, Hebrew and other right-to-left languages.                                                 |
| `hourCycle`          | `"h23"`              | From the user's 24-hour setting, which is not part of the locale and which `Intl` cannot see on its own.      |
| `timeZone`           | `"Europe/Warsaw"`    | The device's IANA time zone.                                                                                  |
| `measurementSystem`  | `"metric"`           | `"metric"`, `"us"` or `"uk"`. Absent below Android 9 (API 28), where the UK system cannot be told apart.      |
| `calendar`           | `"gregory"`          | Unicode calendar identifier as `Intl` spells it.                                                              |
| `firstDayOfWeek`     | `2`                  | `1` is Sunday, `2` is Monday, … `7` is Saturday.                                                               |

Android does not re-render widgets when the language changes, so Voltra does it: a receiver for `LOCALE_CHANGED` re-renders every placed Dynamic Widget after a change of the device language, the app's per-app language or the regional preferences, even when the app is not running. While the app is running, an in-app language switch through `LocaleManager` re-renders them immediately too.

## Translating widget content

Keep one messages object per language and let `resolveLocale` pick one. It tries the app's override first, then the user's languages (exact tag, then language), then `env.locale`, and finally falls back to `en`, `__default`, or the first key.

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

Always pass `env.locale` and `env.hourCycle` explicitly. The runtime's default locale is the process's, and the 24-hour setting only reaches `Intl` through `hourCycle`.

## Intl on Hermes

Hermes on Android implements `Intl.Collator`, `Intl.NumberFormat`, `Intl.DateTimeFormat` and the `toLocale*` methods. It does not implement `Intl.PluralRules`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`, `Intl.DisplayNames` or `Intl.Locale`, and i18n libraries that rely on plural rules (i18next v21+, FormatJS) need them.

`@use-voltra/metro` can load the [FormatJS](https://formatjs.github.io/docs/polyfills) polyfills into Android widget bundles only. Install the packages in the app:

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

Locale data is loaded per language, so `pt-BR` and `pt-PT` both load `pt`. The polyfills are added only to Android widget bundles; iOS bundles, where JavaScriptCore has the full `Intl` API, are unchanged. Each language adds to the bundle size, so list only the ones you translate into.

## Letting the app choose the language

On Android 13 and newer, a per-app language set through `LocaleManager` (or the system's per-app language settings) already reaches widgets as `env.locale`. Apps that keep their own language setting can pass it explicitly:

```ts
import { setDynamicWidgetLocale } from '@use-voltra/android-client'

await setDynamicWidgetLocale('pl') // every render now sees env.appLocale === 'pl'
await setDynamicWidgetLocale(null) // back to the system languages
```

The value survives app restarts, and every placed Dynamic Widget re-renders once it is stored. `resolveLocale` gives `appLocale` precedence automatically.

## Picker and configuration copy

The widget picker name and description accept locale maps and are written to `res/values-<locale>/voltra_widgets.xml`. Configuration copy — `configurationTitle`, `appIntent.parameters[].title` and `options[].title` — accepts locale maps too and is written to the same files under the keys `voltra_widget_<id>_intent_title`, `voltra_widget_<id>_param_<name>_title` and `voltra_widget_<id>_param_<name>_option_<value>` (lower-cased, with anything other than letters, digits and underscores replaced by `_`), so an in-app configuration screen can read it with `getString`.
