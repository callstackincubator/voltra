import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../types'
import { __test__, generateWidgetPreviewLayouts } from './xml'

describe('localeKeyToAndroidValuesQualifier', () => {
  it('maps plain language tags to classic Android qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('pl')).toBe('pl')
  })

  it('maps language-region tags to classic Android qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('pt-BR')).toBe('pt-rBR')
    expect(__test__.localeKeyToAndroidValuesQualifier('pt_BR')).toBe('pt-rBR')
  })

  it('maps script tags to Android BCP-47 qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('zh-Hans')).toBe('b+zh+Hans')
    expect(__test__.localeKeyToAndroidValuesQualifier('zh-Hans-CN')).toBe('b+zh+Hans+CN')
    expect(__test__.localeKeyToAndroidValuesQualifier('sr-Latn-RS')).toBe('b+sr+Latn+RS')
  })
})

describe('generateWidgetInfoXml', () => {
  // The sizing attributes are interpolated into a `dedent` template on their own un-indented
  // line, so their literal padding has to survive dedent's indentation stripping. Assert the
  // whole document rather than the attribute list, so a reformat can't silently break it.
  it('emits every sizing attribute at the same indentation as the rest of the element', () => {
    expect(
      __test__.generateWidgetInfoXml({
        id: 'weather',
        displayName: 'Weather',
        description: 'Shows current weather conditions',
        targetCellWidth: 2,
        targetCellHeight: 2,
      })
    ).toBe(
      [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"',
        '    android:minWidth="130dp"',
        '    android:minHeight="117dp"',
        '    android:targetCellWidth="2"',
        '    android:targetCellHeight="2"',
        '    android:updatePeriodMillis="0"',
        '    android:initialLayout="@layout/voltra_widget_placeholder"',
        '    android:resizeMode="horizontal|vertical"',
        '    android:widgetCategory="home_screen"',
        '    android:description="@string/voltra_widget_weather_description">',
        '</appwidget-provider>',
      ].join('\n')
    )
  })

  it('emits the resize bound attributes at the same indentation, after targetCell', () => {
    expect(
      __test__.generateWidgetInfoXml({
        id: 'weather',
        displayName: 'Weather',
        description: 'Shows current weather conditions',
        targetCellWidth: 2,
        targetCellHeight: 2,
        minResizeWidth: 100,
        minResizeHeight: 90,
        maxResizeWidth: 300,
        maxResizeHeight: 250,
      })
    ).toBe(
      [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"',
        '    android:minWidth="130dp"',
        '    android:minHeight="117dp"',
        '    android:targetCellWidth="2"',
        '    android:targetCellHeight="2"',
        '    android:minResizeWidth="100dp"',
        '    android:minResizeHeight="90dp"',
        '    android:maxResizeWidth="300dp"',
        '    android:maxResizeHeight="250dp"',
        '    android:updatePeriodMillis="0"',
        '    android:initialLayout="@layout/voltra_widget_placeholder"',
        '    android:resizeMode="horizontal|vertical"',
        '    android:widgetCategory="home_screen"',
        '    android:description="@string/voltra_widget_weather_description">',
        '</appwidget-provider>',
      ].join('\n')
    )
  })
})

describe('configuration screen widget info (xml-v31)', () => {
  const scores = {
    id: 'scores',
    entry: './widgets/scores.tsx',
    displayName: 'Scores',
    description: 'Live scores',
    targetCellWidth: 2,
    targetCellHeight: 2,
    appIntent: { parameters: [{ name: 'team', title: 'Team', dynamicOptions: true }] },
  }

  it('adds the configure activity as optional and reconfigurable', () => {
    expect(__test__.generateWidgetInfoXml(scores, undefined, undefined, true)).toBe(
      [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"',
        '    android:minWidth="130dp"',
        '    android:minHeight="117dp"',
        '    android:targetCellWidth="2"',
        '    android:targetCellHeight="2"',
        '    android:updatePeriodMillis="0"',
        '    android:initialLayout="@layout/voltra_widget_placeholder"',
        '    android:resizeMode="horizontal|vertical"',
        '    android:widgetCategory="home_screen"',
        '    android:description="@string/voltra_widget_scores_description"',
        '    android:configure="voltra.dynamicwidget.VoltraWidgetConfigureActivity"',
        '    android:widgetFeatures="reconfigurable|configuration_optional">',
        '</appwidget-provider>',
      ].join('\n')
    )
  })

  it('writes res/xml-v31 only for opted-in widgets, leaves res/xml without the activity, and removes stale copies', async () => {
    const platformProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-xml-v31-'))
    const res = path.join(platformProjectRoot, 'app', 'src', 'main', 'res')
    // generateWidgetInfoFiles creates res/xml first in a real prebuild.
    fs.mkdirSync(path.join(res, 'xml'), { recursive: true })
    const generate = (widgets: AndroidWidgetConfig[]) =>
      generateWidgetPreviewLayouts({
        platformProjectRoot,
        projectRoot: platformProjectRoot,
        widgets,
        previewImageMap: new Map(),
      })
    try {
      await generate([
        { ...scores, configurationScreen: true },
        { ...scores, id: 'plain' },
      ])

      expect(fs.readdirSync(path.join(res, 'xml-v31'))).toEqual(['voltra_widget_scores_info.xml'])
      expect(fs.readFileSync(path.join(res, 'xml-v31', 'voltra_widget_scores_info.xml'), 'utf8')).toContain(
        'android:configure="voltra.dynamicwidget.VoltraWidgetConfigureActivity"'
      )
      expect(fs.readFileSync(path.join(res, 'xml', 'voltra_widget_scores_info.xml'), 'utf8')).not.toContain(
        'android:configure'
      )

      await generate([scores, { ...scores, id: 'plain' }])
      expect(fs.existsSync(path.join(res, 'xml-v31'))).toBe(false)
    } finally {
      fs.rmSync(platformProjectRoot, { recursive: true, force: true })
    }
  })
})

describe('configuration strings in voltra_widgets.xml', () => {
  const widget = {
    id: 'Weather',
    displayName: 'Weather',
    description: 'Forecast',
    targetCellWidth: 2,
    targetCellHeight: 2,
    appIntent: {
      parameters: [
        {
          name: 'units',
          title: { en: 'Units', pl: 'Jednostki' },
          options: [
            { value: 'metric', title: { en: 'Metric', pl: 'Metryczne' } },
            { value: 'us-customary', title: 'US customary' },
          ],
        },
        { name: 'city' },
      ],
    },
  }

  it('writes the iOS sheet keys, sanitised into resource names, in the default folder', () => {
    const xml = __test__.generateVoltraWidgetsStringResourcesXml([widget], null)
    expect(xml).toContain('<string name="voltra_widget_weather_param_units_title">Units</string>')
    expect(xml).toContain('<string name="voltra_widget_weather_param_units_option_metric">Metric</string>')
    expect(xml).toContain('<string name="voltra_widget_weather_param_units_option_us_customary">US customary</string>')
    expect(xml).not.toContain('param_city_title')
  })

  it('translates them per locale folder and adds the locales to the generated set', () => {
    const xml = __test__.generateVoltraWidgetsStringResourcesXml([widget], 'pl')
    expect(xml).toContain('<string name="voltra_widget_weather_param_units_title">Jednostki</string>')
    expect(xml).toContain('<string name="voltra_widget_weather_param_units_option_us_customary">US customary</string>')
    expect([...__test__.collectAndroidLocaleKeysFromWidgets([widget])].sort()).toEqual(['en', 'pl'])
  })
})
