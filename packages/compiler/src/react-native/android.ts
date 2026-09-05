/** The `react-native` surface served to Android widget code. */
import { createPlatform } from './platform.js'

export const Platform = createPlatform('android')
export * from './shim.js'
