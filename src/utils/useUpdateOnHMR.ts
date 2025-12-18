import { useEffect, useState } from 'react'

declare global {
  // HMR accept function
  var __accept: (...args: unknown[]) => void
}

/**
 * Taps into the HMR accept function to forcefully re-render the component when any module is updated.
 * Is only available in development mode.
 */
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
