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

describe('generateWidgetBundleSwift — client-rendered dispatch (Phase 3b-iii)', () => {
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
