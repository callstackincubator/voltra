import { validateLiveActivityConfig } from '../../../plugin/build/validation/validateActivity.js'
import {
  generateDefaultWidgetBundleSwift,
  generateWidgetBundleSwift,
} from '../../../plugin/build/features/ios/files/swift/widgetBundle.js'

describe('validateLiveActivityConfig', () => {
  test('undefined config is valid', () => {
    expect(() => validateLiveActivityConfig(undefined)).not.toThrow()
  })

  test('empty config is valid', () => {
    expect(() => validateLiveActivityConfig({})).not.toThrow()
  })

  test('valid supplementalFamilies with "small" passes', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: ['small'],
      })
    ).not.toThrow()
  })

  test('empty supplementalFamilies array throws', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: [],
      })
    ).toThrow('liveActivity.supplementalFamilies cannot be empty')
  })

  test('invalid family name throws', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: ['medium' as any],
      })
    ).toThrow("Invalid activity family 'medium'")
  })

  test('non-array supplementalFamilies throws', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: 'small' as any,
      })
    ).toThrow('liveActivity.supplementalFamilies must be an array')
  })
})

describe('generateDefaultWidgetBundleSwift', () => {
  test('without supplemental families uses VoltraWidget directly', () => {
    const result = generateDefaultWidgetBundleSwift()

    expect(result).toContain('VoltraWidget()')
    expect(result).not.toContain('VoltraWidgetWithSupplementalFamilies')
    expect(result).not.toContain('.supplementalActivityFamilies')
  })

  test('with supplemental families generates wrapper', () => {
    const result = generateDefaultWidgetBundleSwift(['small'])

    expect(result).toContain('VoltraWidgetWithSupplementalFamilies()')
    expect(result).toContain('struct VoltraWidgetWithSupplementalFamilies: Widget')
    expect(result).toContain('.supplementalActivityFamilies([.small])')
    expect(result).toContain('#available(iOS 18.0, *)')
  })
})

describe('generateWidgetBundleSwift', () => {
  const testWidget = {
    id: 'test',
    displayName: 'Test Widget',
    description: 'A test widget',
  }

  test('without supplemental families uses VoltraWidget directly', () => {
    const result = generateWidgetBundleSwift([testWidget])

    expect(result).toContain('VoltraWidget()')
    expect(result).not.toContain('VoltraWidgetWithSupplementalFamilies')
    expect(result).toContain('struct VoltraWidget_test: Widget')
  })

  test('with supplemental families generates wrapper alongside widgets', () => {
    const result = generateWidgetBundleSwift([testWidget], ['small'])

    expect(result).toContain('VoltraWidgetWithSupplementalFamilies()')
    expect(result).toContain('struct VoltraWidgetWithSupplementalFamilies: Widget')
    expect(result).toContain('.supplementalActivityFamilies([.small])')
    expect(result).toContain('struct VoltraWidget_test: Widget')
  })
})
