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

  test('valid supplementalActivityFamilies with "small" passes', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalActivityFamilies: ['small'],
      })
    ).not.toThrow()
  })

  test('empty supplementalActivityFamilies array throws', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalActivityFamilies: [],
      })
    ).toThrow('liveActivity.supplementalActivityFamilies cannot be empty')
  })

  test('invalid family name throws', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalActivityFamilies: ['medium' as any],
      })
    ).toThrow("Invalid activity family 'medium'")
  })

  test('non-array supplementalActivityFamilies throws', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalActivityFamilies: 'small' as any,
      })
    ).toThrow('liveActivity.supplementalActivityFamilies must be an array')
  })
})

describe('generateDefaultWidgetBundleSwift', () => {
  test('without supplementalActivityFamilies uses VoltraWidget directly', () => {
    const result = generateDefaultWidgetBundleSwift()

    expect(result).toContain('VoltraWidget()')
    expect(result).not.toContain('VoltraWidgetWithSupplementalActivityFamilies')
    expect(result).not.toContain('.supplementalActivityFamilies')
  })

  test('with supplementalActivityFamilies generates wrapper', () => {
    const result = generateDefaultWidgetBundleSwift(['small'])

    expect(result).toContain('VoltraWidgetWithSupplementalActivityFamilies()')
    expect(result).toContain('struct VoltraWidgetWithSupplementalActivityFamilies: Widget')
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

  test('without supplementalActivityFamilies uses VoltraWidget directly', () => {
    const result = generateWidgetBundleSwift([testWidget])

    expect(result).toContain('VoltraWidget()')
    expect(result).not.toContain('VoltraWidgetWithSupplementalActivityFamilies')
    expect(result).toContain('struct VoltraWidget_test: Widget')
  })

  test('with supplementalActivityFamilies generates wrapper alongside widgets', () => {
    const result = generateWidgetBundleSwift([testWidget], ['small'])

    expect(result).toContain('VoltraWidgetWithSupplementalActivityFamilies()')
    expect(result).toContain('struct VoltraWidgetWithSupplementalActivityFamilies: Widget')
    expect(result).toContain('.supplementalActivityFamilies([.small])')
    expect(result).toContain('struct VoltraWidget_test: Widget')
  })
})
