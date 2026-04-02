import { useEffect, useState } from 'react'

declare global {
  var __accept: (...args: unknown[]) => void
}

export const useUpdateOnHMR = () => {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!__DEV__) {
      return
    }

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
