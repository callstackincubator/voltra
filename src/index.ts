import { Platform } from 'react-native'

import VoltraModule from './VoltraModule'

function assertIOS(name: string): boolean {
  const isIOS = Platform.OS === 'ios'

  if (!isIOS) console.error(`${name} is only available on iOS`)

  return isIOS
}

/**
 * End all Voltra instances.
 */
export async function endAllVoltra(): Promise<void> {
  if (!assertIOS('endAllVoltra')) return Promise.resolve()
  return VoltraModule.endAllVoltra?.()
}

/**
 * Preferred alias mirroring iOS terminology.
 */
export async function endAllLiveActivities(): Promise<void> {
  if (!assertIOS('endAllLiveActivities')) return Promise.resolve()
  return VoltraModule.endAllLiveActivities?.()
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
 * Return whether the app was launched in the background (headless).
 * Returns true if the app was launched in background, false if launched in foreground.
 * Always returns false on non-iOS platforms.
 */
export function isHeadless(): boolean {
  if (Platform.OS !== 'ios') return false
  return VoltraModule.isHeadless?.() ?? false
}

/**
 * Debug: list current Voltra Live Activity IDs (if any).
 */
export async function listLiveActivityIds(): Promise<string[]> {
  if (!assertIOS('listLiveActivityIds')) return Promise.resolve([])
  try {
    return (await (VoltraModule as any).listVoltraActivityIds?.()) ?? []
  } catch {
    return []
  }
}

// New API
export * from './events'
export { useVoltra, type UseVoltraOptions, type UseVoltraResult } from './hooks'
export { startVoltra, stopVoltra, updateVoltra } from './imperative-api'
export * as Voltra from './jsx/primitives'
export {
  clearPreloadedImages,
  type PreloadImageOptions,
  preloadImages,
  type PreloadImagesResult,
  reloadLiveActivities,
} from './preload'
export type { VoltraVariants } from './renderer'
export type { VoltraElementJson, VoltraJson, VoltraNodeJson, VoltraVariantsJson } from './types'
export { VoltraView, type VoltraViewProps } from './VoltraView'
