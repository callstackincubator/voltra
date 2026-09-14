import { widgetKind, widgetKindOverrides } from './constants'

describe('widgetKind', () => {
  it('defaults to the prefixed widget id', () => {
    expect(widgetKind({ id: 'weather' })).toBe('Voltra_Widget_weather')
  })

  it('uses the pinned kind when the widget has one', () => {
    expect(widgetKind({ id: 'streak', kind: 'StreakWidget' })).toBe('StreakWidget')
  })
})

describe('widgetKindOverrides', () => {
  it('is undefined when no widget pins a kind, so the Info.plist key stays absent', () => {
    expect(widgetKindOverrides(undefined)).toBeUndefined()
    expect(widgetKindOverrides([])).toBeUndefined()
    expect(widgetKindOverrides([{ id: 'weather' }])).toBeUndefined()
  })

  it('maps only the widgets that pin a kind', () => {
    const overrides = widgetKindOverrides([{ id: 'weather' }, { id: 'streak', kind: 'StreakWidget' }])

    expect(overrides).toEqual({ streak: 'StreakWidget' })
  })
})
