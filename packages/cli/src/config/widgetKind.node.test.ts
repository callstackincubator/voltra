import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { iosWidgetKind, iosWidgetKindOverrides } from './widgetKind.ts'

describe('iosWidgetKind', () => {
  test('defaults to the prefixed widget id', () => {
    assert.equal(iosWidgetKind({ id: 'weather' }), 'Voltra_Widget_weather')
  })

  test('uses the pinned kind when the widget has one', () => {
    assert.equal(iosWidgetKind({ id: 'streak', kind: 'StreakWidget' }), 'StreakWidget')
  })
})

describe('iosWidgetKindOverrides', () => {
  test('is undefined when no widget pins a kind, so the Info.plist key stays absent', () => {
    assert.equal(iosWidgetKindOverrides([{ id: 'weather' }, { id: 'streak' }]), undefined)
    assert.equal(iosWidgetKindOverrides([]), undefined)
  })

  test('maps only the widgets that pin a kind', () => {
    const overrides = iosWidgetKindOverrides([{ id: 'weather' }, { id: 'streak', kind: 'StreakWidget' }])

    assert.deepEqual(overrides, { streak: 'StreakWidget' })
  })
})
