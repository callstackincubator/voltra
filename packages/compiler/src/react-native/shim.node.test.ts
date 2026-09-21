import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import * as android from './android.js'
import * as ios from './ios.js'

/**
 * Metro resolves these entry points directly, with no loader in between, so whatever they
 * export is exactly what a Dynamic Widget sees on device.
 */
describe('react-native shim entry points', () => {
  it('reports the platform it was resolved for', () => {
    assert.equal(ios.Platform.OS, 'ios')
    assert.equal(android.Platform.OS, 'android')
    assert.equal(ios.Platform.select({ ios: 'a', android: 'b' }), 'a')
    assert.equal(android.Platform.select({ native: 'n', default: 'd' }), 'n')
    assert.equal(android.Platform.select({ default: 'd' }), 'd')
  })

  it('passes styles through unchanged', () => {
    const styles = ios.StyleSheet.create({ title: { fontSize: 12 } })
    assert.deepEqual(styles.title, { fontSize: 12 })
    assert.deepEqual(ios.StyleSheet.flatten([{ a: 1 }, false, [{ b: 2 }]]), { a: 1, b: 2 })
    assert.deepEqual(ios.StyleSheet.compose({ a: 1 }, null), { a: 1 })
  })

  it('rejects unsupported exports on use rather than reading as undefined', () => {
    assert.notEqual(ios.View, undefined)
    assert.throws(() => (ios.View as () => void)(), /'View' is not available to Voltra widget code/)
    assert.throws(() => ios.Animated.timing, /'Animated' is not available to Voltra widget code/)
    assert.throws(() => new (android.NativeEventEmitter as new () => void)(), /'NativeEventEmitter' is not available/)
    assert.throws(() => ios.Platform.Version, /'Platform.Version' is not available/)
  })
})
