import { getDynamicLiveActivityAttributesType } from '../../../../../ios/src/live-activity/dynamic'

import type { DetectedIOSWidget } from '../clientRendered'

import { __test__ } from './swift'

describe('generateInitialStatesSwift', () => {
  it('embeds the locale helper into generated initial states Swift', () => {
    const swift = __test__.generateInitialStatesSwift(
      new Map([
        [
          'weather',
          new Map([
            ['en-US', '{"ok":true}'],
            ['pl', '{"ok":false}'],
          ]),
        ],
      ])
    )

    expect(swift).toContain('private enum VoltraGeneratedInitialStateLocale')
    expect(swift).toContain('VoltraGeneratedInitialStateLocale.preferredLanguageTags()')
    expect(swift).toContain('VoltraGeneratedInitialStateLocale.pickJson(from: perLocale, preferredLanguages: tags)')
    expect(swift).not.toContain('VoltraInitialStateLocale.preferredLanguageTags()')
  })
})

describe('generateWidgetBundleSwift — Dynamic Widget dispatch', () => {
  const serverWidget: DetectedIOSWidget = {
    id: 'weather',
    entry: './widgets/weather.tsx',
    displayName: 'Weather',
    description: 'Shows weather',
    clientRendered: false,
  }
  const clientWidget: DetectedIOSWidget = {
    id: 'IosWeatherWidget',
    entry: './widgets/IosWeatherWidget.tsx',
    displayName: 'Client Weather',
    description: 'Dynamic Widget weather',
    clientRendered: true,
    clientSourcePath: '/tmp/IosWeatherWidget.tsx',
  }

  it('emits VoltraHomeWidgetProvider for server-rendered widgets', () => {
    const swift = __test__.generateWidgetBundleSwift([serverWidget])
    expect(swift).toContain('VoltraHomeWidgetProvider(')
    expect(swift).toContain('VoltraHomeWidgetView(entry: entry)')
    expect(swift).not.toContain('VoltraClientWidgetProvider')
  })

  it('emits VoltraClientWidgetProvider + VoltraClientWidgetContentView for Dynamic Widgets', () => {
    const swift = __test__.generateWidgetBundleSwift([clientWidget])
    expect(swift).toContain('VoltraClientWidgetProvider(')
    expect(swift).toContain('VoltraClientWidgetContentView(')
    expect(swift).toContain('initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId)')
    expect(swift).not.toContain('VoltraHomeWidgetProvider(')
  })

  it('generates the Dynamic Widget retry intent into the extension and passes it to the content view', () => {
    const swift = __test__.generateWidgetBundleSwift([clientWidget])
    // The intent has to be defined in the extension target to be in its App Intents metadata.
    expect(swift).toContain('struct VoltraDynamicWidgetRetryIntent: AppIntent')
    expect(swift).toContain('WidgetCenter.shared.reloadTimelines(ofKind: VoltraWidgetKind.kind(for: widgetId))')
    expect(swift).toContain('retryButton: voltraDynamicWidgetRetryButton')
  })

  it('does not generate the retry intent when there is no Dynamic Widget', () => {
    const swift = __test__.generateWidgetBundleSwift([serverWidget])
    expect(swift).not.toContain('VoltraDynamicWidgetRetryIntent')
  })

  it('handles mixed server + client widgets in one bundle', () => {
    const swift = __test__.generateWidgetBundleSwift([serverWidget, clientWidget])
    expect(swift).toContain('VoltraWidget_weather()')
    expect(swift).toContain('VoltraWidget_IosWeatherWidget()')
    expect(swift).toContain('VoltraHomeWidgetProvider(')
    expect(swift).toContain('VoltraClientWidgetProvider(')
  })

  it('keeps WidgetKit kind, supportedFamilies, contentMarginsDisabled identical across modes', () => {
    const serverSwift = __test__.generateWidgetBundleSwift([serverWidget])
    const clientSwift = __test__.generateWidgetBundleSwift([clientWidget])
    for (const swift of [serverSwift, clientSwift]) {
      expect(swift).toMatch(/StaticConfiguration\(\s*\n\s*kind: "Voltra_Widget_/)
      expect(swift).toContain('.supportedFamilies(')
      expect(swift).toContain('.contentMarginsDisabled()')
    }
  })

  it('uses the `kind` option as the WidgetKit kind when set', () => {
    const swift = __test__.generateWidgetBundleSwift([
      { ...serverWidget, kind: 'Widgets' },
      { ...clientWidget, kind: 'LegacyWeather' },
    ])
    expect(swift).toMatch(/StaticConfiguration\(\s*\n\s*kind: "Widgets",/)
    expect(swift).toMatch(/StaticConfiguration\(\s*\n\s*kind: "LegacyWeather",/)
    expect(swift).not.toContain('Voltra_Widget_')
  })
})

describe('Dynamic Live Activity Swift generation', () => {
  const liveActivities = [
    { id: 'order_finished', entry: './live-activities/order-finished.tsx' },
    { id: 'driver_arrived', entry: './live-activities/driver-arrived.tsx' },
  ]

  it('creates distinct ActivityKit types, configurations, and catalog entries', () => {
    const types = __test__.generateDynamicLiveActivityTypesSwift(liveActivities)
    const configurations = __test__.generateDynamicLiveActivitiesSwift(liveActivities)
    const bundle = __test__.generateWidgetBundleSwift([], liveActivities)

    expect(types).toContain('VoltraOrderFinishedLiveActivityAttributes')
    expect(types).toContain(
      `public struct ${getDynamicLiveActivityAttributesType('order_finished')}: ActivityAttributes`
    )
    expect(types).toContain('VoltraDriverArrivedLiveActivityAttributes')
    expect(types).toContain('public typealias ContentState = VoltraDynamicLiveActivityContentState')
    expect(types).toContain('public let name: String')
    expect(types).toContain('public let deepLinkUrl: String?')
    expect(types).toContain('#if canImport(VoltraWidgetRuntime)')
    expect(types).toContain('import VoltraWidgetRuntime')
    expect(types).toContain('import VoltraRuntime')
    expect(configurations).toContain('import VoltraWidgetRuntime')
    expect(configurations).not.toContain('import VoltraRuntime')
    expect(types).toContain('@objc(VoltraGeneratedDynamicLiveActivityRegistration)')
    expect(types).toContain('public final class VoltraGeneratedDynamicLiveActivityRegistration: NSObject')
    expect(types).toContain(
      'VoltraDynamicLiveActivityRegistry.shared.register(VoltraDriverArrivedLiveActivityAttributes.self)'
    )
    expect(types).toContain(
      'VoltraDynamicLiveActivityRegistry.shared.register(VoltraOrderFinishedLiveActivityAttributes.self)'
    )
    expect(types).not.toContain('VoltraDynamicLiveActivityCatalog')
    expect(configurations).toContain('VoltraDynamicLiveActivityRenderer.lockScreen(definitionId: "driver_arrived"')
    expect(configurations).toContain('VoltraDynamicLiveActivityRenderer.dynamicIsland(definitionId: "order_finished"')
    expect(configurations).toContain('.supplementalActivityFamilies([.small, .medium])')
    expect(bundle).toContain('VoltraDynamicLiveActivity_VoltraDriverArrivedLiveActivityAttributes()')
    expect(bundle).toContain('VoltraDynamicLiveActivity_VoltraOrderFinishedLiveActivityAttributes()')
  })

  it('keeps the legacy empty bundle unchanged when no Dynamic Live Activities are declared', () => {
    expect(__test__.generateWidgetBundleSwift([], [])).toContain('import VoltraWidgetRuntime')
    expect(__test__.generateWidgetBundleSwift([], [])).not.toContain('VoltraDynamicLiveActivity_')
  })
})

describe('generateWidgetBundleSwift — AppIntent configuration', () => {
  const configurableWidget: DetectedIOSWidget = {
    id: 'IosWeatherWidget',
    entry: './widgets/IosWeatherWidget.tsx',
    displayName: 'Client Weather',
    description: 'Dynamic Widget weather',
    clientRendered: true,
    clientSourcePath: '/tmp/IosWeatherWidget.tsx',
    appIntent: {
      parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
    },
  }
  const plainClientWidget: DetectedIOSWidget = {
    id: 'PlainClient',
    entry: './widgets/PlainClient.tsx',
    displayName: 'Plain Client',
    description: 'Dynamic Widget, no config',
    clientRendered: true,
    clientSourcePath: '/tmp/PlainClient.tsx',
  }

  it('generates an AppIntentConfiguration with a code-default @Parameter for a configurable widget', () => {
    const swift = __test__.generateWidgetBundleSwift([configurableWidget])
    expect(swift).toContain('import AppIntents')
    expect(swift).toContain('struct VoltraWidget_IosWeatherWidget_Intent: WidgetConfigurationIntent')
    expect(swift).toContain('@Parameter(title: "Label", default: "Hello")')
    expect(swift).toContain('AppIntentConfiguration(')
    expect(swift).toContain('VoltraWidget_IosWeatherWidget_ClientProvider')
    // iOS 17+ gating, since AppIntentConfiguration is unavailable below 17
    expect(swift).toContain('if #available(iOS 17.0, *)')
    expect(swift).toContain('@available(iOS 17.0, *)')
  })

  it('passes the configured parameter into the entry (env.configuration)', () => {
    const swift = __test__.generateWidgetBundleSwift([configurableWidget])
    expect(swift).toContain('VoltraClientWidgetProvider.loadEntry(widgetId:')
    expect(swift).toContain('["label": configuration.label]')
  })

  it('emits VoltraDynamicWidgetServerUpdateProvider for a Dynamic Widget with a serverUpdate', () => {
    const swift = __test__.generateWidgetBundleSwift([
      {
        ...plainClientWidget,
        serverUpdate: { url: 'https://example.com/weather', intervalMinutes: 15, refresh: false },
      },
    ])

    expect(swift).toContain('VoltraDynamicWidgetServerUpdateProvider(')
    expect(swift).toContain('VoltraClientWidgetContentView(')
    // The provider wraps the plain one; the widget must not also be given it directly.
    expect(swift).not.toContain('provider: VoltraClientWidgetProvider(')
  })

  it('fetches on every timeline request for a configurable server-driven Dynamic Widget', () => {
    const swift = __test__.generateWidgetBundleSwift([
      {
        ...configurableWidget,
        serverUpdate: { url: 'https://example.com/weather', intervalMinutes: 15, refresh: false },
      },
    ])

    expect(swift).toContain('VoltraDynamicWidgetServerUpdateProvider.timeline(')
    expect(swift).toContain('family: context.family')
    expect(swift).not.toContain('policy: .never')
  })

  it('keeps a Dynamic Widget without a serverUpdate on the never policy', () => {
    const swift = __test__.generateWidgetBundleSwift([configurableWidget])

    expect(swift).toContain('policy: .never')
    expect(swift).not.toContain('VoltraDynamicWidgetServerUpdateProvider')
  })

  it('keys locale-mapped parameter titles into Localizable.strings with bare string literals', () => {
    const swift = __test__.generateWidgetBundleSwift([
      {
        ...configurableWidget,
        id: 'weather',
        appIntent: {
          parameters: [
            { name: 'label', title: { en: 'Label', pl: 'Etykieta' }, default: 'Hello' },
            { name: 'plain', title: 'Plain', default: 'x' },
          ],
        },
      },
    ])

    expect(swift).toContain('@Parameter(title: "voltra_widget_weather_param_label_title", default: "Hello")')
    expect(swift).toContain('@Parameter(title: "Plain", default: "x")')
    // The `table:` initializer form is deliberately not used at the @Parameter site (ADR 0009 T5).
    expect(swift).not.toMatch(/@Parameter\(title: LocalizedStringResource/)
  })

  it('keeps the English "Configure <name>" intent title', () => {
    const swift = __test__.generateWidgetBundleSwift([
      { ...configurableWidget, displayName: { en: 'Weather', pl: 'Pogoda' } },
    ])

    expect(swift).toContain('static var title: LocalizedStringResource = "Configure Weather"')
  })

  it('turns static options into an AppEnum picker and passes the raw value to env.configuration', () => {
    const swift = __test__.generateWidgetBundleSwift([
      {
        ...configurableWidget,
        id: 'weather',
        appIntent: {
          parameters: [
            {
              name: 'units',
              title: { en: 'Units', pl: 'Jednostki' },
              default: 'imperial',
              options: [
                { value: 'metric', title: { en: 'Metric', pl: 'Metryczne' } },
                { value: 'imperial', title: 'Imperial' },
              ],
            },
          ],
        },
      },
    ])

    expect(swift).toContain('enum VoltraWidget_weather_units_Option: String, AppEnum {')
    expect(swift).toContain('case option0 = "metric"')
    expect(swift).toContain('case option1 = "imperial"')
    expect(swift).toContain(
      'static var typeDisplayRepresentation: TypeDisplayRepresentation = "voltra_widget_weather_param_units_title"'
    )
    expect(swift).toContain('.option0: "voltra_widget_weather_param_units_option_metric",')
    expect(swift).toContain('.option1: "Imperial",')
    expect(swift).toMatch(
      /@Parameter\(title: "voltra_widget_weather_param_units_title", default: \.option1\)\s*var units: VoltraWidget_weather_units_Option/
    )
    expect(swift).toContain('["units": configuration.units.rawValue]')
    expect(swift).toContain('configuration: ["units": "imperial"])')
  })

  it('turns dynamicOptions into an AppEntity whose query reads the choices the app set', () => {
    const swift = __test__.generateWidgetBundleSwift([
      {
        ...configurableWidget,
        id: 'masjid_times',
        serverUpdate: { url: 'https://api.example.com/masjids/{masjid}/widget', intervalMinutes: 15, refresh: false },
        appIntent: { parameters: [{ name: 'masjid', title: 'Masjid', dynamicOptions: true }] },
      },
    ])

    expect(swift).toContain('struct VoltraWidget_masjid_times_masjid_Choice: AppEntity {')
    expect(swift).toContain('struct VoltraWidget_masjid_times_masjid_ChoiceQuery: EntityQuery {')
    expect(swift).toContain(
      'VoltraWidgetDefaults.widgetParameterOptions(widgetId: "masjid_times", parameter: "masjid")'
    )
    expect(swift).toContain('DisplayRepresentation(title: "\\(title)")')
    // No code default: the parameter is nil until picked, and falls back to the first choice.
    expect(swift).toMatch(/@Parameter\(title: "Masjid"\)\s*var masjid: VoltraWidget_masjid_times_masjid_Choice\?/)
    expect(swift).toContain(
      '["masjid": (configuration.masjid?.id ?? VoltraWidget_masjid_times_masjid_ChoiceQuery().fallbackValue())]'
    )
    expect(swift).toContain('configuration: ["masjid": ""])')
  })

  it('names the intent and entity after a pre-Voltra widget, generating each once for widgets that share them', () => {
    const appIntent = {
      intentName: 'SelectMasjidConfigurationAppIntent',
      parameters: [{ name: 'masjid', title: 'Masjid', dynamicOptions: true, entityName: 'FollowedMasjid' }],
    }
    const swift = __test__.generateWidgetBundleSwift([
      { ...configurableWidget, id: 'prayer_times', appIntent },
      { ...configurableWidget, id: 'prayer_times_lock_screen', appIntent },
    ])
    const count = (text: string) => swift.split(text).length - 1

    expect(count('struct SelectMasjidConfigurationAppIntent: WidgetConfigurationIntent {')).toBe(1)
    expect(count('struct FollowedMasjid: AppEntity {')).toBe(1)
    expect(count('struct FollowedMasjidQuery: EntityQuery {')).toBe(1)
    expect(count('intent: SelectMasjidConfigurationAppIntent.self')).toBe(2)
    expect(count('typealias Intent = SelectMasjidConfigurationAppIntent')).toBe(2)
    expect(swift).toMatch(/@Parameter\(title: "Masjid"\)\s*var masjid: FollowedMasjid\?/)
    expect(swift).toContain('(configuration.masjid?.id ?? FollowedMasjidQuery().fallbackValue())')
    expect(swift).not.toContain('VoltraWidget_prayer_times_Intent')
    expect(swift).not.toContain('_masjid_Choice')
  })

  it('keeps the generated names per widget when no intent or entity name is set', () => {
    const appIntent = { parameters: [{ name: 'masjid', title: 'Masjid', dynamicOptions: true }] }
    const swift = __test__.generateWidgetBundleSwift([
      { ...configurableWidget, id: 'first', appIntent },
      { ...configurableWidget, id: 'second', appIntent },
    ])

    for (const id of ['first', 'second']) {
      expect(swift).toContain(`struct VoltraWidget_${id}_Intent: WidgetConfigurationIntent {`)
      expect(swift).toContain(`struct VoltraWidget_${id}_masjid_Choice: AppEntity {`)
    }
  })

  it('does NOT emit AppIntent code for a client widget without appIntent', () => {
    const swift = __test__.generateWidgetBundleSwift([plainClientWidget])
    expect(swift).toContain('VoltraClientWidgetProvider(')
    expect(swift).not.toContain('AppIntentConfiguration(')
    expect(swift).not.toContain('WidgetConfigurationIntent')
  })

  it('imports AppIntents exactly once, in the header, whether or not a widget has an appIntent', () => {
    const count = (swift: string) => swift.split('import AppIntents').length - 1
    // The retry intent of a Dynamic Widget needs it too, so a plain Dynamic Widget gets the header import.
    expect(count(__test__.generateWidgetBundleSwift([plainClientWidget]))).toBe(1)
    expect(count(__test__.generateWidgetBundleSwift([configurableWidget]))).toBe(1)
    expect(count(__test__.generateWidgetBundleSwift([plainClientWidget, configurableWidget]))).toBe(1)
    // No Dynamic Widget, no retry intent, no import.
    expect(count(__test__.generateWidgetBundleSwift([{ ...plainClientWidget, clientRendered: false }]))).toBe(0)
    // The import sits in the header, before the first declaration.
    const swift = __test__.generateWidgetBundleSwift([plainClientWidget])
    expect(swift.indexOf('import AppIntents')).toBeLessThan(swift.indexOf('struct VoltraWidgetBundle'))
  })
})
