import { resolve } from './index'

// Expose for Hermes evaluation in the Android widget extension.
// Kotlin (via JNI) calls: globalThis.VoltraRenderer.resolve(payload, appIntentParams)
;(globalThis as unknown as Record<string, unknown>)['VoltraRenderer'] = { resolve }
