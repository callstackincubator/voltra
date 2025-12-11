import { useCallback, useEffect, useRef, useState } from 'react'

import { addVoltraListener } from './events'
import {
  EndVoltraOptions,
  isVoltraActive,
  startVoltra,
  StartVoltraOptions,
  stopVoltra,
  updateVoltra,
  UpdateVoltraOptions,
} from './imperative-api'
import { VoltraVariants } from './renderer'
import { useUpdateOnHMR } from './utils'

export type UseVoltraOptions = {
  /**
   * The unique identifier of the Live Activity.
   * Allows you to rebind to the same activity on app restart.
   */
  activityId?: string
  /**
   * Automatically start the Live Activity when the component mounts.
   */
  autoStart?: boolean
  /**
   * Automatically update the Live Activity when the component updates.
   */
  autoUpdate?: boolean
  /**
   * URL to open when the Live Activity is tapped.
   */
  deepLinkUrl?: string
}

export type UseVoltraResult = {
  start: (options?: StartVoltraOptions) => Promise<void>
  update: (options?: UpdateVoltraOptions) => Promise<void>
  end: (options?: EndVoltraOptions) => Promise<void>
  isActive: boolean
}

export const useVoltra = (variants: VoltraVariants, options?: UseVoltraOptions): UseVoltraResult => {
  const [targetId, setTargetId] = useState<string | null>(() => {
    if (options?.activityId) {
      return isVoltraActive(options.activityId) ? options.activityId : null
    }

    return null
  })
  const isActive = targetId !== null
  const optionsRef = useRef(options)
  const lastUpdateOptionsRef = useRef<UpdateVoltraOptions | undefined>(undefined)

  useUpdateOnHMR()

  const start = useCallback(
    async (options?: StartVoltraOptions) => {
      const id = await startVoltra(variants, { ...optionsRef.current, ...options })
      setTargetId(id)
    },
    [variants]
  )

  const update = useCallback(
    async (options?: UpdateVoltraOptions) => {
      if (!targetId) {
        return
      }

      const updateOptions = { ...optionsRef.current, ...options }
      lastUpdateOptionsRef.current = updateOptions
      await updateVoltra(targetId, variants, updateOptions)
    },
    [variants, targetId]
  )

  const end = useCallback(
    async (options?: EndVoltraOptions) => {
      if (!targetId) {
        return
      }

      await stopVoltra(targetId, options)
      setTargetId(null)
    },
    [targetId]
  )

  useEffect(() => {
    if (!options?.autoStart) {
      return
    }

    start()
  }, [options?.autoStart, start])

  useEffect(() => {
    if (!options?.autoUpdate) return
    update(lastUpdateOptionsRef.current)
  }, [options?.autoUpdate, variants, update])

  useEffect(() => {
    if (!targetId) return

    const subscription = addVoltraListener('stateChange', (event) => {
      if (event.activityName !== targetId) return

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
