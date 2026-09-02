import type { AndroidWidgetConfig } from '../../types'
import { __test__ } from './xml'

function baseWidget(overrides: Partial<AndroidWidgetConfig> = {}): AndroidWidgetConfig {
  return {
    id: 'sample',
    displayName: 'Sample',
    description: 'A sample widget',
    targetCellWidth: 3,
    targetCellHeight: 2,
    ...overrides,
  }
}

describe('generateWidgetInfoXml', () => {
  it('derives minWidth/minHeight from targetCellWidth/targetCellHeight when nothing else is set', () => {
    const xml = __test__.generateWidgetInfoXml(baseWidget())

    expect(xml).toContain('android:minWidth="180dp"')
    expect(xml).toContain('android:minHeight="110dp"')
    expect(xml).toContain('android:targetCellWidth="3"')
    expect(xml).toContain('android:targetCellHeight="2"')
  })

  it('derives minWidth/minHeight from minCellWidth/minCellHeight when provided', () => {
    const xml = __test__.generateWidgetInfoXml(baseWidget({ minCellWidth: 2, minCellHeight: 1 }))

    expect(xml).toContain('android:minWidth="110dp"')
    expect(xml).toContain('android:minHeight="40dp"')
  })

  it('prefers explicit minWidth/minHeight over any cell-derived value', () => {
    const xml = __test__.generateWidgetInfoXml(
      baseWidget({ minWidth: 200, minHeight: 150, minCellWidth: 2, minCellHeight: 1 })
    )

    expect(xml).toContain('android:minWidth="200dp"')
    expect(xml).toContain('android:minHeight="150dp"')
  })
})

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
