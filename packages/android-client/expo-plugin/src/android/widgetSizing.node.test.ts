import { androidWidgetSizingAttributes, androidWidgetSizingWarnings } from './widgetSizing'

// Cell size varies by device: a bug report measured one grid cell as 69dp wide on a Samsung phone
// but 111dp wide on a Samsung tablet. The previous formula gave a 2-cell-wide widget a 110dp
// minWidth, which fit inside a single tablet cell and produced a 1-cell-wide widget there instead
// of the intended 2 cells.
describe('androidWidgetSizingAttributes', () => {
  it('derives minWidth/minHeight from targetCellWidth/targetCellHeight (2x2)', () => {
    expect(androidWidgetSizingAttributes({ targetCellWidth: 2, targetCellHeight: 2 })).toEqual([
      'android:minWidth="130dp"',
      'android:minHeight="117dp"',
      'android:targetCellWidth="2"',
      'android:targetCellHeight="2"',
    ])
  })

  it('derives minWidth/minHeight from targetCellWidth/targetCellHeight (3x2)', () => {
    const attrs = androidWidgetSizingAttributes({ targetCellWidth: 3, targetCellHeight: 2 })
    expect(attrs).toContain('android:minWidth="203dp"')
    expect(attrs).toContain('android:minHeight="117dp"')
  })

  it('derives minWidth/minHeight from targetCellWidth/targetCellHeight (1x1)', () => {
    const attrs = androidWidgetSizingAttributes({ targetCellWidth: 1, targetCellHeight: 1 })
    expect(attrs).toContain('android:minWidth="57dp"')
    expect(attrs).toContain('android:minHeight="51dp"')
  })

  it('uses explicit minWidth/minHeight when provided (the bug report config)', () => {
    const attrs = androidWidgetSizingAttributes({
      targetCellWidth: 3,
      targetCellHeight: 3,
      minWidth: 200,
      minHeight: 100,
    })
    expect(attrs).toContain('android:minWidth="200dp"')
    expect(attrs).toContain('android:minHeight="100dp"')
  })

  it('derives minWidth/minHeight from the deprecated minCellWidth/minCellHeight when set', () => {
    const attrs = androidWidgetSizingAttributes({
      targetCellWidth: 4,
      targetCellHeight: 4,
      minCellWidth: 2,
      minCellHeight: 2,
    })
    expect(attrs).toContain('android:minWidth="130dp"')
    expect(attrs).toContain('android:minHeight="117dp"')
  })

  it('prefers explicit minWidth/minHeight over the deprecated minCellWidth/minCellHeight', () => {
    const attrs = androidWidgetSizingAttributes({
      targetCellWidth: 4,
      targetCellHeight: 4,
      minWidth: 200,
      minHeight: 100,
      minCellWidth: 2,
      minCellHeight: 2,
    })
    expect(attrs).toContain('android:minWidth="200dp"')
    expect(attrs).toContain('android:minHeight="100dp"')
  })

  it('emits all four resize bounds after the targetCell attributes, in order, with a dp suffix', () => {
    expect(
      androidWidgetSizingAttributes({
        targetCellWidth: 2,
        targetCellHeight: 2,
        minResizeWidth: 100,
        minResizeHeight: 90,
        maxResizeWidth: 300,
        maxResizeHeight: 250,
      })
    ).toEqual([
      'android:minWidth="130dp"',
      'android:minHeight="117dp"',
      'android:targetCellWidth="2"',
      'android:targetCellHeight="2"',
      'android:minResizeWidth="100dp"',
      'android:minResizeHeight="90dp"',
      'android:maxResizeWidth="300dp"',
      'android:maxResizeHeight="250dp"',
    ])
  })

  it('leaves the attribute list unchanged when resize bounds are omitted', () => {
    const attrs = androidWidgetSizingAttributes({ targetCellWidth: 2, targetCellHeight: 2 })
    expect(attrs).toHaveLength(4)
  })

  it('appends only the resize bounds that are set', () => {
    expect(
      androidWidgetSizingAttributes({
        targetCellWidth: 2,
        targetCellHeight: 2,
        minResizeWidth: 100,
        maxResizeHeight: 250,
      })
    ).toEqual([
      'android:minWidth="130dp"',
      'android:minHeight="117dp"',
      'android:targetCellWidth="2"',
      'android:targetCellHeight="2"',
      'android:minResizeWidth="100dp"',
      'android:maxResizeHeight="250dp"',
    ])
  })
})

describe('androidWidgetSizingWarnings', () => {
  it('produces no warnings when the bounds are consistent with the resolved minimum size', () => {
    expect(
      androidWidgetSizingWarnings(
        {
          targetCellWidth: 2,
          targetCellHeight: 2,
          minResizeWidth: 100,
          minResizeHeight: 90,
          maxResizeWidth: 300,
          maxResizeHeight: 250,
        },
        'weather'
      )
    ).toEqual([])
  })

  it('produces no warnings when nothing is set', () => {
    expect(androidWidgetSizingWarnings({ targetCellWidth: 2, targetCellHeight: 2 }, 'weather')).toEqual([])
  })

  it('warns exactly once, naming minResizeWidth, when it is greater than the resolved minWidth', () => {
    const warnings = androidWidgetSizingWarnings(
      { targetCellWidth: 2, targetCellHeight: 2, minWidth: 130, minResizeWidth: 200 },
      'weather'
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('minResizeWidth')
  })

  it('warns exactly once, naming maxResizeWidth, when it is smaller than the resolved minWidth', () => {
    const warnings = androidWidgetSizingWarnings(
      { targetCellWidth: 2, targetCellHeight: 2, minWidth: 130, maxResizeWidth: 100 },
      'weather'
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('maxResizeWidth')
  })

  it('compares against the derived minWidth when none was set explicitly', () => {
    expect(
      androidWidgetSizingWarnings({ targetCellWidth: 2, targetCellHeight: 2, minResizeWidth: 200 }, 'weather')
    ).toHaveLength(1)
    expect(
      androidWidgetSizingWarnings({ targetCellWidth: 2, targetCellHeight: 2, minResizeWidth: 100 }, 'weather')
    ).toEqual([])
  })
})
