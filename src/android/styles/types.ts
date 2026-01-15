import type { StyleProp } from 'react-native'

// TODO: Implement Android-specific style types
// Placeholder for now - will be implemented in next step
export type VoltraAndroidViewStyle = Record<string, unknown>

export type VoltraAndroidTextStyle = VoltraAndroidViewStyle

export type VoltraAndroidStyleProp = StyleProp<VoltraAndroidViewStyle>
export type VoltraAndroidTextStyleProp = StyleProp<VoltraAndroidTextStyle>
