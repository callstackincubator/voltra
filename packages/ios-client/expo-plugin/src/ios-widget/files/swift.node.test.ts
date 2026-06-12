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

describe('generateWidgetBundleSwift — client-rendered dispatch', () => {
  const serverWidget: DetectedIOSWidget = {
    id: 'weather',
    displayName: 'Weather',
    description: 'Shows weather',
    clientRendered: false,
  }
  const clientWidget: DetectedIOSWidget = {
    id: 'IosWeatherWidget',
    displayName: 'Client Weather',
    description: 'Client-rendered weather',
    clientRendered: true,
    clientComponentName: 'IosWeatherWidget',
    clientSourcePath: '/tmp/IosWeatherWidget.tsx',
  }

  it('emits VoltraHomeWidgetProvider for server-rendered widgets', () => {
    const swift = __test__.generateWidgetBundleSwift([serverWidget])
    expect(swift).toContain('VoltraHomeWidgetProvider(')
    expect(swift).toContain('VoltraHomeWidgetView(entry: entry)')
    expect(swift).not.toContain('VoltraClientWidgetProvider')
  })

  it('emits VoltraClientWidgetProvider + VoltraClientWidgetContentView for client-rendered widgets', () => {
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

describe('generateWidgetBundleSwift — AppIntent configuration', () => {
  const configurableWidget: DetectedIOSWidget = {
    id: 'IosWeatherWidget',
    displayName: 'Client Weather',
    description: 'Client-rendered weather',
    clientRendered: true,
    clientComponentName: 'IosWeatherWidget',
    clientSourcePath: '/tmp/IosWeatherWidget.tsx',
    appIntent: {
      parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
    },
  }
  const plainClientWidget: DetectedIOSWidget = {
    id: 'PlainClient',
    displayName: 'Plain Client',
    description: 'Client-rendered, no config',
    clientRendered: true,
    clientComponentName: 'PlainClient',
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
