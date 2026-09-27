# ADR 0008: Localisation for Dynamic Widgets and Dynamic Live Activities

Status: Accepted

## Introduction

Dynamic Widgets and Dynamic Live Activities run a JS entry on the device
(JSC in the WidgetKit extension, Hermes in the Android app process) on every
render, and the native side hands that entry a `WidgetEnvironment` that
already carries `env.locale`. The question this ADR answers:

1. Which localisation needs of a widget or Live Activity author does Voltra
   cover today, and which does it not?
2. Can the gap be closed by on-demand rendering of the JS entry with the
   current locale passed in, so that JS stays the single source of truth?
3. What about the things iOS bakes at build time, such as the widget gallery
   copy and the `@Parameter` titles of the Edit Widget sheet? Is there a
   better way than build-time strings?

Every platform claim below was checked against Apple, Android, Hermes or
WebKit documentation or source, listed under [Sources](#sources). Where a
claim could not be verified from documentation, it is marked **unverified**
and turned into a device test in [Verification](#verification).

## Context

### What exists

| Concern                                       | iOS today                                                                                                                                                                                         | Android today                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `env.locale` for the JS entry                 | `Locale.identifier` of the SwiftUI `\.locale` environment: the ICU form `pl_PL`, which may also carry `@`-keywords (`VoltraClientWidgetRuntime.swift`, `VoltraDynamicLiveActivityRenderer.swift`) | `configuration.locales[0].toLanguageTag()`: the BCP-47 form `pl-PL` (`VoltraClientGlanceWidget.kt`)           |
| Type contract for `env.locale`                | `packages/core/src/widget-environment.ts` promises a BCP-47 tag on both platforms                                                                                                                 | same                                                                                                          |
| Fallback language list                        | not exposed                                                                                                                                                                                       | not exposed                                                                                                   |
| Re-render when the language changes           | WidgetKit reloads automatically (see below)                                                                                                                                                       | `VoltraModule` listens to configuration changes but deliberately ignores everything except the light/dark bit |
| Gallery / picker `displayName`, `description` | locale map in app.json → `<locale>.lproj/VoltraWidgets.strings` + `LocalizedStringResource(table:)`                                                                                               | locale map → `res/values-<qualifier>/voltra_widgets.xml`                                                      |
| Edit Widget sheet: parameter titles           | `@Parameter(title: "<plain title>")`, one language; intent title is `Configure <English displayName>`                                                                                             | no native configuration UI yet; titles unused                                                                 |
| Pre-rendered first view                       | per-locale `initialStatePath`, picked at runtime from `Locale.preferredLanguages`                                                                                                                 | per-locale `initialStatePath`, picked from `configuration.locales`                                            |
| Server request                                | `locale` query parameter, BCP-47 via `identifier(.bcp47)`                                                                                                                                         | `locale` query parameter, BCP-47                                                                              |
| Formatting APIs inside the JS runtime         | JavaScriptCore.framework `Intl` (full, see below)                                                                                                                                                 | Hermes `Intl` subset (see below)                                                                              |
| Widget bundle polyfills                       | none: `getPolyfills: () => []` in `createWidgetMetroConfig.ts`                                                                                                                                    | none, plus no-op `console`/timer shims injected by `VoltraJSRenderer.kt`                                      |
| Documentation examples                        | `toLocaleTimeString('en-US', …)` hard-coded                                                                                                                                                       | same                                                                                                          |
| Extension bundle localisations                | `CFBundleDevelopmentRegion` only; `.lproj` folders exist only when a gallery locale map is used                                                                                                   | n/a (widgets render in the app process, with the app's resources)                                             |

### What a widget author needs

The checklist below is what a real widget or Live Activity has to get right.
"Covered" means it works today with the documented API; "Gap" means it does
not, or only by accident.

| Need                                                           | iOS                          | Android                  |
| -------------------------------------------------------------- | ---------------------------- | ------------------------ |
| Translated UI strings, chosen from the user's language list    | Gap (G1, G2)                 | Gap (G5)                 |
| Plurals, gender, ordinal forms                                 | Covered by JSC `Intl`        | Gap (G4)                 |
| Dates and times in the user's format and 12/24-hour preference | Gap (G1, G6)                 | Gap (G6)                 |
| Numbers, currency, percent                                     | Covered by JSC `Intl`        | Covered by Hermes `Intl` |
| Units and measurement system (°C/°F, km/mi)                    | Gap (G6)                     | Gap (G6)                 |
| Relative time ("3 min ago") and list joining ("a, b and c")    | Covered by JSC `Intl`        | Gap (G4)                 |
| Live countdowns                                                | Covered natively by `Timer`  | no `Timer` component     |
| Right-to-left layout and text direction                        | Gap (G6)                     | Gap (G6)                 |
| Respecting a per-app language the user picked in Settings      | Gap (G2)                     | Covered on Android 13+   |
| Updating already-placed widgets when the language changes      | Covered by WidgetKit         | Gap (G3)                 |
| Localised gallery / picker name and description                | Covered                      | Covered                  |
| Localised Edit Widget sheet: parameter titles, option labels   | Gap (G7)                     | not applicable yet (G8)  |
| Localised Live Activity content from a push                    | Gap (G1) otherwise covered   | n/a                      |
| Localised push alert text (`alert.title`/`body`)               | Out of scope: APNs `loc-key` | n/a                      |

### Platform facts that shape the design

**iOS reloads widgets on a locale change by itself.** Apple's WidgetKit
guide lists "The system locale changes" among the events for which WidgetKit
reloads a widget without charging its budget, and says: "For cases such as
system appearance changes or system locale changes, don't request a timeline
reload from your app. The system updates your widgets automatically." So a
JS entry that reads `env.locale` at render time is re-run with the new value
on iOS with no Voltra work.

**`Locale.current` is the app's language, not the device's.** Apple
documents that `Locale.current` is based on "the current system locale, any
app-specific locale choice made in the Settings app, [and] the availability
of the preferred locale in the app. For example, if the person using an app
has set their device to use a Spanish-language locale, but the app only
supports English, this value returns an English locale." QA1828 spells out
the algorithm: iOS walks the user's preferred languages and picks the first
one for which the bundle has an `.lproj` folder (or a `CFBundleLocalizations`
entry), else `CFBundleDevelopmentRegion`. In a widget extension "the bundle"
is the extension bundle, and Voltra's generated extension has no `.lproj`
folders unless a gallery locale map happens to be configured. The practical
result is that a Polish user of an app whose extension has no `pl.lproj`
gets `en_PL` in `env.locale`, and gets `pl_PL` only if the developer
localised the gallery name into Polish. `Locale.preferredLanguages`, by
contrast, is "a list of the user's preferred languages" independent of the
bundle, which is what the existing initial-state picker already uses.

**Per-app language does not reach extensions reliably.** Apple developer
forum threads 719808 and 756597 document that since iOS 16.1, again in iOS 17
and still in iOS 18, widget and other extensions see the device language
rather than the language chosen for the app in Settings; an Apple DTS
engineer called it "a regression on iOS 17". A further iOS 26.0 bug where
widgets did not update after switching the app language was fixed in
iOS 26.1 (thread 797431). In thread 661833 an Apple Frameworks Engineer gave
the supported workaround for runtime language choice: "share the configured
language from the host app to the widget by using an App Group. Then during
timeline creation, the widget can fetch the language and create entries
appropriately."

**The Edit Widget sheet is system UI with build-time metadata.**
`@Parameter(title:)` takes a `LocalizedStringResource`, which Apple describes
as "a reference to a localizable string, accessible from another process" so
that "the Siri UI [can] potentially use different localization preferences
than the app providing the intent". The App Intents metadata processor reads
these at build time and rejects anything but a string literal or a direct
`LocalizedStringResource(...)` initializer call (forum thread 781162 quotes
the compiler error). On which language the sheet uses, a DTS engineer
answered in thread 772209: "the widget configuration UI honors the system
language and not the per-app language, because the UI is part of the
system." So parameter titles can be localised, but only through strings
tables in the extension bundle, never through JS. The values a parameter
offers are different: `DynamicOptionsProvider.results()` is `async throws`
and is invoked by the system "when configuring the parameter", so option
labels can be computed at runtime.

**Gallery names can be runtime text but should not be.**
`configurationDisplayName(_:)` has overloads for `LocalizedStringResource`,
`LocalizedStringKey`, `StringProtocol` and `Text`, so a runtime string is
technically possible. It is evaluated when the extension is queried by the
gallery, a system process, and the current `.strings`-table approach already
covers it. No change is proposed.

**`Locale.identifier(.bcp47)` carries user preferences.** Available from
iOS 16 (Voltra's minimum is 16.4), it returns a BCP-47 tag such as
`th-TH-u-ca-gregory-nu-thai`, and `Locale.hourCycle` documents that on
`Locale.current` "if the user overrode the default hour cycle, this property
provides the user's preference", surfaced as the `hc` Unicode extension. A
BCP-47 tag is therefore also how the 24-Hour Time switch reaches JS.

**JSC has the whole `Intl` surface.** JavaScriptCore.framework is the same
engine as Safari. MDN's compatibility data for iOS Safari gives
`Intl.PluralRules` 13, `Intl.RelativeTimeFormat` 14, `Intl.DisplayNames`
14.1, `Intl.ListFormat` 14.5, `Intl.DateTimeFormat` `dateStyle`/`timeStyle`
14.1 and `hourCycle` 13, all below Voltra's 16.4 floor. WebKit computes the
default `Intl` locale from `CFLocaleCopyPreferredLanguages`, that is the
device preference list, not the extension bundle; so a call without an
explicit locale and a call with `env.locale` can disagree. Widget code must
always pass the locale explicitly.

**Hermes has a subset.** React Native builds Hermes for Android with
`-DHERMES_ENABLE_INTL=True` ("We intentionally build Hermes with Intl support
only"), and Voltra consumes that same `hermes-android` prefab. Hermes'
`IntlAPIs.md` lists `Intl.Collator`, `Intl.NumberFormat`,
`Intl.DateTimeFormat`, `Intl.getCanonicalLocales` and the `toLocale*` /
`localeCompare` methods as supported. `Intl.PluralRules`,
`Intl.RelativeTimeFormat`, `Intl.ListFormat`, `Intl.DisplayNames` and
`Intl.Segmenter` are absent; `Features.md` lists them as "Planned" and issue
#1462 (PluralRules) is open with the maintainers pointing at the
`intl-pluralrules` polyfill. i18n libraries that rely on `Intl.PluralRules`
(i18next v21+, FormatJS) need that polyfill on Android. The Android `Intl`
implementation calls Java classes through fbjni, which needs an initialised
fbjni environment in the process. Whether that holds in a process started
only for a widget update, before any React Native library ran, is
**unverified** (T4 below).

**Android does not re-render widgets on a locale change.** The AOSP
`AppWidgetServiceImpl` (main, Android 13 and Android 14 tags) re-broadcasts
`ACTION_APPWIDGET_UPDATE` on package changes only; it has no locale handling.
The launcher re-applies the last `RemoteViews`, in which Glance has already
baked literal strings, so a placed Voltra widget keeps the old language until
something re-renders it. `Intent.ACTION_LOCALE_CHANGED` is the hook: it fires
"when the device locale, the receiving app's locale (set via
`LocaleManager.setApplicationLocales`) or language tags of Regional
preferences changed", "can be received by manifest-declared receivers", and
is on the implicit-broadcast exception list, so it reaches a stopped app on
Android 8+. `LocaleManager.setApplicationLocales` additionally documents that
per-app locales "will result in a configuration change" for the app and that
"users' locale preferences are passed to applications by creating a union of
any app-specific locales and system locales, with the app-specific locales
appearing first", which is what `configuration.locales` in the app process
reflects. On Android 12 and lower the AppCompat per-app language API only
affects `AppCompatActivity` contexts, not the application context Glance
renders with, so a widget there follows the system language.

**The 24-hour preference on Android is not part of the locale.**
`DateFormat.is24HourFormat(context)` is a separate user setting that
`Intl.DateTimeFormat` cannot see; it has to be passed to JS explicitly.

### Findings

- **G1 — iOS `env.locale` is not BCP-47.** `Locale.identifier` yields
  `pl_PL` (the shared test fixture even asserts `"locale":"pl_PL"`).
  ECMA-402 rejects underscores as structurally invalid, so
  `new Date().toLocaleTimeString(env.locale)` throws a `RangeError` on iOS
  and works on Android. The TypeScript contract and both platforms disagree.
  Dynamic Live Activities have the same bug.
- **G2 — iOS language selection is accidental.** `env.locale` follows the
  extension bundle's localisations, which Voltra never declares, and does
  not follow a per-app language on iOS 17 and 18. No fallback list is
  exposed, so JS cannot negotiate a language itself.
- **G3 — Android widgets go stale after a language change** until the next
  props update, and a Voltra module that only re-renders on a light/dark
  flip cannot help when the app process is not running.
- **G4 — Plural rules, relative time, list formatting and display names are
  missing on Android** and the widget bundle strips all polyfills, so an
  author gets an exception at render time.
- **G5 — Android exposes only the first locale**, not the user's ordered
  list, so JS cannot fall back from `de-CH` to `de` to `fr`.
- **G6 — Formatting preferences beyond the language are not exposed**:
  12/24-hour, layout direction, measurement system, time zone, calendar,
  first weekday.
- **G7 — The iOS Edit Widget sheet is English-only**: parameter titles are
  single strings and the generated intent title is `Configure <English
name>`. Parameter values are free-form strings, so there is no place to
  put localised option labels either.
- **G8 — Android configuration titles are inert** until a native
  configuration UI exists; when it does, it needs the same locale maps.
- **G9 — The documentation teaches `toLocaleTimeString('en-US', …)`**, which
  hides all of the above from readers.

## Decision

Make on-demand JS rendering the single source of truth for everything the
widget draws, by giving the entry a complete and correct locale environment
on both platforms and by re-rendering whenever it changes. Keep build-time
strings, generated from the same app.json locale maps that gallery labels
already use, for the two surfaces the operating system renders itself: the
widget gallery and the iOS Edit Widget sheet. Nothing else needs a native
localisation mechanism.

### 1. A complete locale environment

Extend `WidgetEnvironment` (and therefore `LiveActivityEnvironment`, which
picks from it) with:

```ts
/** BCP-47 tag with Unicode extensions, e.g. "pl-PL" or "en-US-u-hc-h23". */
locale: string
/** The user's ordered language list, BCP-47, independent of what the bundle supports. */
preferredLanguages: string[]
/** Language the app asked Voltra to render in; see §3. Absent unless set. */
appLocale?: string
layoutDirection: 'ltr' | 'rtl'
/** Effective clock preference, already reconciled with the user's setting. */
hourCycle: 'h12' | 'h23'
timeZone: string
measurementSystem?: 'metric' | 'us' | 'uk'
calendar?: string
firstDayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7
```

Native sources:

| Field                | iOS                                                                     | Android                                                                                |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `locale`             | `locale.identifier(.bcp47)` of the SwiftUI `\.locale` (fixes G1)        | `locales[0].toLanguageTag()` (unchanged)                                               |
| `preferredLanguages` | `Locale.preferredLanguages`                                             | `configuration.locales`, every entry, `toLanguageTag()`                                |
| `layoutDirection`    | SwiftUI `\.layoutDirection`                                             | `TextUtils.getLayoutDirectionFromLocale(locales[0])`                                   |
| `hourCycle`          | `Locale.hourCycle` (`.oneToTwelve`/`.zeroToEleven` → `h12`, else `h23`) | `DateFormat.is24HourFormat(context)`                                                   |
| `timeZone`           | `TimeZone.current.identifier`                                           | `TimeZone.getDefault().id`                                                             |
| `measurementSystem`  | `Locale.measurementSystem`                                              | `LocaleData`/`android.icu.util.LocaleData.getMeasurementSystem` (API 28+), else absent |
| `calendar`           | `Locale.calendar.identifier`                                            | `android.icu.util.Calendar.getInstance(locale).type`                                   |
| `firstDayOfWeek`     | `Locale.firstDayOfWeek`                                                 | `java.util.Calendar.getInstance(locale).firstDayOfWeek`                                |

`env.date` stays epoch milliseconds; with `timeZone` in the env a widget can
format it correctly even though the runtime's own default zone is the
process's.

### 2. Re-render on every locale change

- iOS: nothing to add. WidgetKit reloads on a locale change, and the JS
  entry reads the environment on every render.
- Android: add a manifest-declared receiver for
  `android.intent.action.LOCALE_CHANGED` in `@use-voltra/android-client` that
  calls `WidgetOrchestrator.reloadClientWidgets()`. It fires for device,
  per-app and regional-preference changes and reaches a stopped app. Also
  let the existing `ComponentCallbacks` in `VoltraModule` react to a
  `locales` change while the process is alive, so an in-app language switch
  re-renders immediately.

### 3. An app-controlled language override

Following the workaround an Apple Frameworks Engineer gave for runtime
language choice, add `setDynamicWidgetLocale(tag | null)` to both clients.
It stores the tag in the App Group `UserDefaults` (iOS) and in Voltra's
`SharedPreferences` (Android) and triggers a reload; the renderer surfaces it
as `env.appLocale`. This is the only way a per-app language reaches a
WidgetKit extension on iOS 17 and 18, and it also serves apps that keep their
own language setting instead of the system one. JS decides the precedence;
Voltra's helper (§5) uses `appLocale`, then `preferredLanguages`, then
`locale`.

### 4. Declare the extension's localisations

Mirror the app's supported languages into the generated extension: write
`CFBundleLocalizations` into the extension `Info.plist` from the Expo
`locales` config and the app's `knownRegions`, and generate an empty
`<lang>.lproj` for each so `Locale.current` and `\.locale` in the extension
resolve like they do in the app. This removes the accident where localising
a gallery label silently changes `env.locale`.

### 5. JS-side negotiation and formatting

- Move `pickLocalizedValue` from `@use-voltra/expo-plugin` into
  `@use-voltra/core` and export a `resolveLocale(env, supported)` helper that
  applies the same fallback order the initial-state pickers use (exact tag,
  language, `en`, `__default`, first). Widget authors then keep one messages
  object per language and one call resolves it.
- Document that every `Intl` and `toLocale*` call must pass `env.locale`,
  never rely on the runtime default.
- Ship `@use-voltra/metro` with an opt-in Android-only prelude that loads
  the FormatJS polyfills for `PluralRules`, `RelativeTimeFormat`,
  `ListFormat` and `DisplayNames` with locale data for the app's declared
  languages, resolved through the `.android.js` shim path so iOS bundles stay
  polyfill-free. Until then, document the polyfill imports.
- Rewrite the documentation examples to use `env.locale` and `env.hourCycle`.

### 6. Edit Widget sheet: locale maps, generated strings, literal keys

Allow `title` on `appIntent.parameters[]` and a new `configurationTitle` on
the widget to be a `WidgetLocalizedCopy` map, like `displayName`. The iOS
generator emits, per locale, `Localizable.strings` in the extension with
keys `voltra_widget_<id>_param_<name>_title` and
`voltra_widget_<id>_intent_title`, and writes the parameter as

```swift
@Parameter(title: "voltra_widget_weather_param_units_title", default: "metric")
```

A bare string-literal key in the default `Localizable` table is the form the
App Intents metadata processor accepts without question. Using
`LocalizedStringResource(key, defaultValue:, table:)` at that site is a
direct initializer call and should also pass, but it is **unverified** (T5);
the bare key form is the fallback. The extension is generated and owned by
Voltra, so owning its `Localizable.strings` does not collide with the app.

Add an optional `options: [{ value, title }]` to a parameter, with
localisable titles. The generator emits an `AppEnum` whose
`caseDisplayRepresentations` reference the same string keys, so the sheet
shows a localised picker instead of a free-text field. `env.configuration`
keeps receiving the raw `value`. Runtime-computed option lists through
`DynamicOptionsProvider` remain possible later, but static options cover the
unit/theme/source cases the docs describe and need no process to be alive.

The Android generator writes the same keys into
`res/values-<qualifier>/voltra_widgets.xml` so a future configuration
Activity can read them with no new configuration surface.

### 7. Documentation and version plans

Website: a new "Localisation" page per platform covering the environment
fields, the negotiation helper, the Android polyfills, the override API, and
the locale-map forms for gallery and sheet copy; update the Dynamic Widgets,
Dynamic Live Activities and Configurable Widgets pages. Changesets: `patch`
for `@use-voltra/ios-client` (G1) and `minor` for `@use-voltra/core`,
`@use-voltra/ios-client`, `@use-voltra/android-client`, `@use-voltra/metro`
and the two expo-plugin packages.

## Alternatives considered

### Build-time per-locale bundles for Dynamic Widgets

Extend the `initialStatePath` locale-map mechanism to the JS entry: one
bundle per language, picked at runtime. Rejected. It multiplies bundle size
by the number of languages inside a 30 MB extension, cannot format dates or
numbers, cannot follow a language change without re-picking, and moves
translation out of JS, which is the opposite of what the question asks for.

### Native-side string lookup

Give `Voltra.Text` a `localizedKey` prop resolved from `.strings` and
`strings.xml`. Rejected as the primary mechanism. It splits the source of
truth between JS and native tables, cannot express plural or gender logic,
and the iOS lookup would inherit the same extension-bundle and per-app
language problems as `Locale.current`. Everything it would provide, the
environment plus JS `Intl` provides better.

### Localising the Edit Widget sheet from JS

Not possible for parameter titles: the metadata is extracted at build time
from literals, and the sheet is drawn by the system in the system language.
Possible in principle for option labels through `DynamicOptionsProvider`,
whose `results()` could evaluate the widget bundle and ask JS for labels,
but that spins up JSC inside the configuration UI for a list that is static
in practice. Static `options` with locale maps cover the need; the dynamic
route stays open as a later addition.

### Localising gallery copy from JS

`configurationDisplayName(Text(verbatim:))` would allow it, but the gallery
is system UI evaluated when the extension is queried, and the existing
`.strings` table approach already works. Not worth the moving parts.

### Pre-localised props from the server or the app

A server-driven widget could return already-translated strings using the
`locale` query parameter, and an app could do the same through
`updateDynamicWidget`. This remains a valid pattern for content that is
authored per language on a backend, but it cannot react to a language change
between fetches, it duplicates every formatting rule outside JS, and for
Live Activities started by push it makes every producer responsible for
every language. It complements the decision; it does not replace it.

## Consequences

- One JS entry renders correctly in every language and format the device is
  set to, on both platforms, and follows changes without app involvement on
  iOS and with one broadcast receiver on Android.
- `env.locale` changes shape on iOS from `pl_PL` to `pl-PL`. Any widget that
  parsed the underscore form breaks; the documented contract was always
  BCP-47, so this is a bug fix, released as such.
- Android bundles that use plural, relative-time or list formatting grow by
  the polyfill and its locale data. iOS bundles do not.
- The gallery and the iOS Edit Widget sheet remain build-time and follow the
  system language, which is how Apple designs them; the app.json locale map
  is the single source for those strings, and the same maps feed both
  platforms.
- Per-app language on iOS 17 and 18 works only through the explicit override
  API until Apple fixes the extension regression; the override also gives
  apps with an in-app language picker a supported path.

## Verification

Device tests to run before the ADR is accepted, each with the expected
outcome:

- **T1** iPhone set to Polish, app with no `pl` localisation: `env.locale`
  today; then after §4, and `env.preferredLanguages` in both cases.
- **T2** Per-app language set to Polish on an English device, iOS 17, 18 and
  26.1: what `\.locale` reports in the extension, and that `env.appLocale`
  from §3 reaches a render after `setDynamicWidgetLocale('pl')`.
- **T3** Android: change the system language with the app process killed;
  the placed Dynamic Widget re-renders through the `LOCALE_CHANGED` receiver.
  Repeat with a per-app language on Android 13+.
- **T4** Android: cold process started only by WorkManager for a server
  update, widget calls `Intl.DateTimeFormat(env.locale)`: no fbjni crash.
- **T5** iOS: `@Parameter(title: LocalizedStringResource("key",
defaultValue: "…", table: "VoltraWidgets"))` builds and the sheet shows
  the Polish title; otherwise fall back to a bare key in `Localizable`.
- **T6** Arabic device: `env.layoutDirection === 'rtl'` and `HStack`/`Row`
  mirror.
- **T7** 24-Hour Time on in a `en_US` region on both platforms:
  `env.hourCycle === 'h23'` and `Intl.DateTimeFormat(env.locale, {
timeStyle: 'short' })` prints 24-hour on iOS through the `-u-hc-h23`
  extension.

## Sources

- Apple, WidgetKit, [Keeping a widget up to date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date): locale change reloads.
- Apple, Foundation, [`Locale.current`](https://developer.apple.com/documentation/foundation/locale/current), [`Locale.preferredLanguages`](https://developer.apple.com/documentation/foundation/locale/preferredlanguages), [`Locale.identifier(_:)`](<https://developer.apple.com/documentation/foundation/locale/identifier(_:)>), [`Locale.IdentifierType.bcp47`](https://developer.apple.com/documentation/foundation/locale/identifiertype/bcp47), [`Locale.hourCycle`](https://developer.apple.com/documentation/foundation/locale/hourcycle), [`Locale.Language.characterDirection`](https://developer.apple.com/documentation/foundation/locale/language-swift.struct/characterdirection).
- Apple, [QA1828: How iOS Determines the Language For Your App](https://developer.apple.com/library/archive/qa/qa1828/_index.html).
- Apple, Foundation, [`LocalizedStringResource`](https://developer.apple.com/documentation/foundation/localizedstringresource).
- Apple, App Intents, [`IntentParameter`](https://developer.apple.com/documentation/appintents/intentparameter), [`DynamicOptionsProvider`](https://developer.apple.com/documentation/appintents/dynamicoptionsprovider); WidgetKit, [Making a configurable widget](https://developer.apple.com/documentation/widgetkit/making-a-configurable-widget).
- Apple, SwiftUI, [`configurationDisplayName(_:)`](<https://developer.apple.com/documentation/swiftui/widgetconfiguration/configurationdisplayname(_:)>).
- Apple Developer Forums: [719808](https://developer.apple.com/forums/thread/719808) and [756597](https://developer.apple.com/forums/thread/756597) (extensions ignore per-app language, DTS: iOS 17 regression), [797431](https://developer.apple.com/forums/thread/797431) (iOS 26.0 bug fixed in 26.1), [772209](https://developer.apple.com/forums/thread/772209) (configuration UI follows system language), [661833](https://developer.apple.com/forums/thread/661833) (App Group language sharing), [781162](https://developer.apple.com/forums/thread/781162) (metadata processor requires literal or initializer).
- MDN browser-compat-data for [`Intl.PluralRules`](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Intl/PluralRules.json), [`Intl.RelativeTimeFormat`](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Intl/RelativeTimeFormat.json), [`Intl.ListFormat`](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Intl/ListFormat.json), [`Intl.DisplayNames`](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Intl/DisplayNames.json), [`Intl.DateTimeFormat`](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/Intl/DateTimeFormat.json).
- WebKit, [`Source/WTF/wtf/cf/LanguageCF.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WTF/wtf/cf/LanguageCF.cpp): default language from `CFLocaleCopyPreferredLanguages`.
- Hermes, [`doc/IntlAPIs.md`](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md), [`doc/Features.md`](https://github.com/facebook/hermes/blob/main/doc/Features.md), [issue #1462](https://github.com/facebook/hermes/issues/1462), [`lib/Platform/Intl/PlatformIntlAndroid.cpp`](https://github.com/facebook/hermes/blob/main/lib/Platform/Intl/PlatformIntlAndroid.cpp), [`CMakeLists.txt`](https://github.com/facebook/hermes/blob/main/CMakeLists.txt) (`HERMES_ENABLE_INTL` default off).
- React Native, [`ReactAndroid/hermes-engine/build.gradle.kts`](https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/hermes-engine/build.gradle.kts): `-DHERMES_ENABLE_INTL=True`.
- Android, [`Intent.ACTION_LOCALE_CHANGED`](https://developer.android.com/reference/android/content/Intent#ACTION_LOCALE_CHANGED), [Implicit broadcast exceptions](https://developer.android.com/develop/background-work/background-tasks/broadcasts/broadcast-exceptions), [`LocaleManager`](https://developer.android.com/reference/android/app/LocaleManager), [Per-app language preferences](https://developer.android.com/guide/topics/resources/app-languages), [`DateFormat.is24HourFormat`](https://developer.android.com/reference/android/text/format/DateFormat), [`AppWidgetProviderInfo`](https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo), [Manage and update GlanceAppWidget](https://developer.android.com/develop/ui/compose/glance/glance-app-widget).
- AOSP, [`AppWidgetServiceImpl.java`](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/services/appwidget/java/com/android/server/appwidget/AppWidgetServiceImpl.java) (main, `android-13.0.0_r1`, `android-14.0.0_r1`): no locale handling; update broadcast only in `updateProvidersForPackageLocked`.
