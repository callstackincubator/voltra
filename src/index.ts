import { Platform } from 'react-native'

import VoltraUIModule from './VoltraUIModule'

function assertIOS(name: string): boolean {
  const isIOS = Platform.OS === 'ios'

  if (!isIOS) console.error(`${name} is only available on iOS`)

  return isIOS
}

/**
 * End all VoltraUI instances.
 */
export async function endAllVoltraUI(): Promise<void> {
  if (!assertIOS('endAllVoltraUI')) return Promise.resolve()
  return VoltraUIModule.endAllVoltraUI?.()
}

/**
 * Preferred alias mirroring iOS terminology.
 */
export async function endAllLiveActivities(): Promise<void> {
  if (!assertIOS('endAllLiveActivities')) return Promise.resolve()
  return VoltraUIModule.endAllLiveActivities?.()
}

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
 * Debug: list current VoltraUI Live Activity IDs (if any).
 */
export async function listLiveActivityIds(): Promise<string[]> {
  if (!assertIOS('listLiveActivityIds')) return Promise.resolve([])
  try {
    return (await (VoltraUIModule as any).listVoltraUIActivityIds?.()) ?? []
  } catch {
    return []
  }
}

// New API
export * from './events'
export { useVoltra, type UseVoltraOptions, type UseVoltraResult } from './hooks'
export { startVoltra, stopVoltra, updateVoltra } from './imperative-api'
export * as Voltra from './jsx/primitives'
export type { VoltraVariants } from './renderer'
export type { VoltraElementJson, VoltraIslandVariants, VoltraJson, VoltraNodeJson, VoltraVariantsJson } from './types'
