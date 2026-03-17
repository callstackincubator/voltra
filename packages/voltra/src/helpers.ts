import { Platform } from 'react-native'

import VoltraModule from './VoltraModule.js'

/**
 * Return whether Liquid Glass APIs are supported on this device (iOS 26+).
 * This is a convenience gate for authoring fallbacks in JS.
 */
export function isGlassSupported(): boolean {
  if (Platform.OS !== 'ios') return false
  const v: any = Platform.Version
  let major = 0
  if (typeof v === 'string') {
    const m = parseInt(v.split('.')[0] || '0', 10)
    if (!Number.isNaN(m)) major = m
  } else if (typeof v === 'number') {
    major = Math.floor(v)
  }
  return major >= 26
}

/**
 * Return whether the app was launched in the background (headless).
 * Returns true if the app was launched in background, false if launched in foreground.
 * Always returns false on non-iOS platforms.
 */
export function isHeadless(): boolean {
  if (Platform.OS !== 'ios') return false
  return VoltraModule.isHeadless?.() ?? false
}
