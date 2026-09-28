import { useEffect, useState } from 'react'

import { getFastRefreshHub } from './fastRefreshHub.js'

declare const __DEV__: boolean | undefined

/**
 * Force the calling component to re-render whenever Metro applies a Fast Refresh
 * patch, so freshly patched Voltra payloads are re-rendered. Shared by the iOS and
 * Android client packages; relies on the process-wide {@link FastRefreshHub}.
 */
export const useUpdateOnHMR = () => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!__DEV__) {
      return
    }

    return getFastRefreshHub().onPatch(() => {
      forceUpdate((prev) => prev + 1)
    })
  }, [])
}
