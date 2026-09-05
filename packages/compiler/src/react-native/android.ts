/** The `react-native` surface served to Android widget code. */
import { createPlatform, StyleSheet } from './shim'

export const Platform = createPlatform('android')
export { StyleSheet }
