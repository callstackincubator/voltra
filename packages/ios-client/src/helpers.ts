import { useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'

import { getNativeVoltra } from './VoltraModule.js'

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
  return getNativeVoltra().isHeadless?.() ?? false
}

export function useIsHeadless(): boolean {
  const [headless, setHeadless] = useState(isHeadless)

  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const updateIfActive = () => {
      if (AppState.currentState === 'active') {
        setHeadless(isHeadless())
      }
    }

    updateIfActive()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setHeadless(isHeadless())
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return headless
}
