import { androidWidgetSizingAttributes } from './widgetSizing'

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
})
