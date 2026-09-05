/** The `react-native` surface served to iOS widget code. */
import { createPlatform, StyleSheet } from './shim'

export const Platform = createPlatform('ios')
export { StyleSheet }
