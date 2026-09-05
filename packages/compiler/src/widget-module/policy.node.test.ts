import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getWidgetReactNativeShimSpecifier, isReactNativeImport, resolveWidgetImport } from './policy'

describe('resolveWidgetImport', () => {
  it('aliases react-native to the platform shim', () => {
    assert.deepEqual(resolveWidgetImport('react-native', 'android'), {
      kind: 'alias',
      specifier: getWidgetReactNativeShimSpecifier('android'),
    })
  })

  it('blocks react-native deep imports', () => {
    const resolution = resolveWidgetImport('react-native/Libraries/Image/Image', 'ios')
    assert.equal(resolution.kind, 'blocked')
  })

  it('aliases client packages to their rendering package with a warning', () => {
    assert.deepEqual(resolveWidgetImport('@use-voltra/android-client', 'android'), {
      kind: 'alias',
      specifier: '@use-voltra/android',
      warning: "Widget code imported '@use-voltra/android-client'. Using '@use-voltra/android' instead.",
    })
  })

  it('passes everything else through', () => {
    assert.deepEqual(resolveWidgetImport('@use-voltra/ios', 'ios'), { kind: 'passthrough' })
    assert.deepEqual(resolveWidgetImport('react', 'ios'), { kind: 'passthrough' })
  })

  it('recognises react-native specifiers', () => {
    assert.equal(isReactNativeImport('react-native'), true)
    assert.equal(isReactNativeImport('react-native/Libraries/Text/Text'), true)
    assert.equal(isReactNativeImport('react-native-svg'), false)
  })
})
