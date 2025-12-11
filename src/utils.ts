import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

export const assertRunningOnApple = (): boolean => {
  if (Platform.OS !== 'ios') {
    console.error(`Voltra is available only on iOS!`)
    return false
  }

  return true
}

declare global {
  // HMR accept function
  var __accept: (...args: unknown[]) => void
}

export const useUpdateOnHMR = () => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!__DEV__) {
      return
    }

    // Override the accept function to forcefully re-render when any module is updated
    const oldAccept = global['__accept']
    global['__accept'] = (...args) => {
      forceUpdate((prev) => prev + 1)
      oldAccept?.(...args)
    }

    return () => {
      global['__accept'] = oldAccept
    }
  }, [])
}
