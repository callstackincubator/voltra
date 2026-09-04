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
})
