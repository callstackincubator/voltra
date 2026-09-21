/** The `react-native` surface served to iOS widget code. */
import { createPlatform } from './platform.js'

export const Platform = createPlatform('ios')
export * from './shim.js'
