import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { __test__ } from './generated.ts'

import type { NormalizedAndroidWidgetConfig } from '../../config/types.ts'

describe('configuration strings in voltra_widgets.xml (ADR 0008)', () => {
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
  } as unknown as NormalizedAndroidWidgetConfig

  test('writes the same keys as the Expo plugin in the default folder', () => {
    const xml = __test__.generateWidgetStringsXml([widget], null)

    assert.ok(xml.includes('<string name="voltra_widget_weather_param_units_title">Units</string>'))
    assert.ok(
      xml.includes('<string name="voltra_widget_weather_param_units_option_us_customary">US customary</string>')
    )
    assert.ok(!xml.includes('param_city_title'))
  })

  test('translates them per locale folder', () => {
    const xml = __test__.generateWidgetStringsXml([widget], 'pl')

    assert.ok(xml.includes('<string name="voltra_widget_weather_param_units_option_metric">Metryczne</string>'))
    assert.deepEqual([...__test__.collectWidgetLocaleKeys([widget])].sort(), ['en', 'pl'])
  })
})
