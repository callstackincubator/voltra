import { Platform } from 'react-native'

import VoltraModule from './VoltraModule.js'

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

export function isHeadless(): boolean {
  if (Platform.OS !== 'ios') return false
  return VoltraModule.isHeadless?.() ?? false
}
