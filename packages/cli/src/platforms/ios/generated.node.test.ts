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
