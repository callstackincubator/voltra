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
    expect(types).toContain('public static let attributesTypeName = "VoltraOrderFinishedLiveActivityAttributes"')
    expect(types).toContain('import VoltraWidget')
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
    expect(__test__.generateWidgetBundleSwift([], [])).toContain('import VoltraWidget')
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

  it('does NOT emit AppIntent code for a client widget without appIntent', () => {
    const swift = __test__.generateWidgetBundleSwift([plainClientWidget])
    expect(swift).toContain('VoltraClientWidgetProvider(')
    expect(swift).not.toContain('AppIntentConfiguration(')
    expect(swift).not.toContain('WidgetConfigurationIntent')
    expect(swift).not.toContain('import AppIntents')
  })
})
