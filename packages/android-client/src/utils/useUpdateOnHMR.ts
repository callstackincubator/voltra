import { getFastRefreshHub } from '@use-voltra/android'
import { useEffect, useState } from 'react'

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
