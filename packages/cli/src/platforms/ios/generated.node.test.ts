import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { __test__ } from './generated.ts'

import type { DetectedIOSWidget } from './generated.ts'

describe('generateWidgetBundleSwift', () => {
  test('imports the compiled VoltraRuntime module, not the VoltraWidget pod name', () => {
    const swift = __test__.generateWidgetBundleSwift([])

    assert.ok(swift.includes('import VoltraRuntime'))
    assert.ok(!swift.includes('import VoltraWidget'))
  })

  test('imports VoltraRuntime when widgets are configured too', () => {
    const widget: DetectedIOSWidget = {
      id: 'weather',
      displayName: 'Weather',
      description: 'Shows weather',
      supportedFamilies: ['systemSmall'],
      clientRendered: false,
    }

    const swift = __test__.generateWidgetBundleSwift([widget])

    assert.ok(swift.includes('import VoltraRuntime'))
    assert.ok(!swift.includes('import VoltraWidget'))
  })

  test('defaults the WidgetKit kind to the prefixed widget id', () => {
    const widget: DetectedIOSWidget = {
      id: 'weather',
      displayName: 'Weather',
      description: 'Shows weather',
      supportedFamilies: ['systemSmall'],
      clientRendered: false,
    }

    const swift = __test__.generateWidgetBundleSwift([widget])

    assert.ok(swift.includes('kind: "Voltra_Widget_weather"'))
  })

  test('uses the `kind` option as the WidgetKit kind when set', () => {
    // A widget migrated from a hand-written extension keeps the kind its placed instances use.
    const widget: DetectedIOSWidget = {
      id: 'streak',
      kind: 'StreakWidget',
      displayName: 'Streak',
      description: 'Your daily streak',
      supportedFamilies: ['systemSmall'],
      clientRendered: false,
    }

    const swift = __test__.generateWidgetBundleSwift([widget])

    assert.ok(swift.includes('kind: "StreakWidget"'))
    assert.ok(!swift.includes('Voltra_Widget_streak'))
  })
})

describe('localisation (ADR 0008)', () => {
  const configurable: DetectedIOSWidget = {
    id: 'weather',
    entry: './widgets/weather.tsx',
    displayName: { en: 'Weather', pl: 'Pogoda' },
    description: 'Forecast',
    supportedFamilies: ['systemSmall'],
    clientRendered: true,
    clientSourcePath: '/tmp/weather.tsx',
    configurationTitle: { en: 'Weather settings', pl: 'Ustawienia pogody' },
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
        { name: 'city', title: 'City', default: 'Warsaw' },
      ],
    },
  }

  test('declares the app and widget languages, plus en', () => {
    assert.deepEqual(__test__.resolveExtensionLocalizations(['de'], [configurable]), ['de', 'en', 'pl'])
    assert.deepEqual(__test__.resolveExtensionLocalizations([], []), [])
  })

  test('keys locale-mapped sheet titles and emits an AppEnum for static options', () => {
    const swift = __test__.generateWidgetBundleSwift([configurable])

    assert.ok(swift.includes('static var title: LocalizedStringResource = "voltra_widget_weather_intent_title"'))
    assert.ok(swift.includes('enum VoltraWidget_weather_units_Option: String, AppEnum {'))
    assert.ok(swift.includes('.option0: "voltra_widget_weather_param_units_option_metric",'))
    assert.ok(swift.includes('.option1: "Imperial",'))
    assert.ok(
      swift.includes(
        '@Parameter(title: "voltra_widget_weather_param_units_title", default: .option1)\n  var units: VoltraWidget_weather_units_Option'
      )
    )
    assert.ok(swift.includes('@Parameter(title: "City", default: "Warsaw")\n  var city: String'))
    assert.ok(swift.includes('"units": configuration.units.rawValue'))
    assert.ok(swift.includes('configuration: ["units": "imperial", "city": "Warsaw"]'))
  })

  test('writes Localizable.strings with fallback for every declared language', async () => {
    const fs = await import('node:fs')
    const os = await import('node:os')
    const path = await import('node:path')
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-l10n-'))
    try {
      const result = await __test__.generateLocalizableStrings(
        root,
        path.join(root, 'Ext'),
        ['en', 'fr', 'pl'],
        [configurable]
      )
      assert.deepEqual(result.files.sort(), [
        'Ext/en.lproj/Localizable.strings',
        'Ext/fr.lproj/Localizable.strings',
        'Ext/pl.lproj/Localizable.strings',
      ])
      const polish = fs.readFileSync(path.join(root, 'Ext', 'pl.lproj', 'Localizable.strings'), 'utf8')
      assert.ok(polish.includes('"voltra_widget_weather_param_units_title" = "Jednostki";'))
      const french = fs.readFileSync(path.join(root, 'Ext', 'fr.lproj', 'Localizable.strings'), 'utf8')
      assert.ok(french.includes('"voltra_widget_weather_intent_title" = "Weather settings";'))
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
