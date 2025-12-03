import { useCallback, useEffect, useRef, useState } from 'react'

import { addVoltraListener } from './events'
import { startVoltra, stopVoltra, updateVoltra } from './imperative-api'
import { VoltraVariants } from './renderer'

export type UseVoltraOptions = {
  autoStart?: boolean
  autoUpdate?: boolean
  deepLinkUrl?: string
}

export type UseVoltraResult = {
  start: () => Promise<void>
  update: () => Promise<void>
  end: () => Promise<void>
  isActive: boolean
}

export const useVoltra = (variants: VoltraVariants, options?: UseVoltraOptions): UseVoltraResult => {
  const [targetId, setTargetId] = useState<string | null>(null)
  const isActive = targetId !== null
  const optionsRef = useRef(options)

  const start = useCallback(async () => {
    const id = await startVoltra(variants, optionsRef.current)
    setTargetId(id)
  }, [variants])

  const update = useCallback(async () => {
    if (!targetId) return
    await updateVoltra(targetId, variants)
  }, [variants, targetId])

  const end = useCallback(async () => {
    if (!targetId) return
    await stopVoltra(targetId)
    setTargetId(null)
  }, [targetId])

  useEffect(() => {
    if (!options?.autoStart) return
    start().catch(() => null)
  }, [options?.autoStart, start])

  useEffect(() => {
    if (!options?.autoUpdate) return
    update().catch(() => null)
  }, [options?.autoUpdate, variants, update])

  useEffect(() => {
    if (!targetId) return

    const subscription = addVoltraListener('stateChange', (event) => {
      if (event.activityID !== targetId) return

      if (event.activityState === 'dismissed' || event.activityState === 'ended') {
        // Live Activity is no longer active.
        setTargetId(null)
      }
    })

    return () => subscription.remove()
  }, [targetId])

  return {
    start,
    update,
    end,
    isActive,
  }
}
