import { useCallback, useEffect, useRef, useState } from 'react'

import { renderLiveActivityToString, type DismissalPolicy, type LiveActivityVariants } from '@use-voltra/ios'

import { addVoltraListener } from '../events.js'
import { logger } from '../logger.js'
import { assertRunningOnApple, useUpdateOnHMR } from '../utils/index.js'
import VoltraModule from '../VoltraModule.js'

export type SharedLiveActivityOptions = {
  staleDate?: number
  relevanceScore?: number
  dismissalPolicy?: DismissalPolicy
}

export type StartLiveActivityOptions = {
  activityName?: string
  deepLinkUrl?: string
  channelId?: string
} & SharedLiveActivityOptions

export type UpdateLiveActivityOptions = SharedLiveActivityOptions

export type EndLiveActivityOptions = {
  dismissalPolicy?: DismissalPolicy
}

export type UseLiveActivityOptions = {
  activityName?: string
  autoStart?: boolean
  autoUpdate?: boolean
  deepLinkUrl?: string
  channelId?: string
}

export type UseLiveActivityResult = {
  start: (options?: StartLiveActivityOptions) => Promise<void>
  update: (options?: UpdateLiveActivityOptions) => Promise<void>
  end: (options?: EndLiveActivityOptions) => Promise<void>
  isActive: boolean
}

const normalizeSharedLiveActivityOptions = (
  options?: SharedLiveActivityOptions
): SharedLiveActivityOptions | undefined => {
  if (!options) return undefined

  const normalizedOptions: SharedLiveActivityOptions = {}

  if (options.staleDate !== undefined) {
    if (options.staleDate < Date.now()) {
      logger.warn('Ignoring staleDate because it is in the past, the Live Activity would be dismissed immediately.')
    } else {
      normalizedOptions.staleDate = options.staleDate
    }
  }

  const relevanceScore = options.relevanceScore ?? 0.0
  if (relevanceScore < 0 || relevanceScore > 1) {
    logger.warn('Ignoring relevanceScore because it is out of range [0.0, 1.0], using default 0.0')
    normalizedOptions.relevanceScore = 0.0
  } else {
    normalizedOptions.relevanceScore = relevanceScore
  }

  return Object.keys(normalizedOptions).length > 0 ? normalizedOptions : undefined
}

const normalizeEndLiveActivityOptions = (
  options?: EndLiveActivityOptions
): { dismissalPolicy?: { type: 'immediate' | 'after'; date?: number } } | undefined => {
  if (!options?.dismissalPolicy) return undefined

  if (typeof options.dismissalPolicy === 'string') {
    if (options.dismissalPolicy === 'immediate') {
      return { dismissalPolicy: { type: 'immediate' } }
    }
  } else if (typeof options.dismissalPolicy === 'object' && 'after' in options.dismissalPolicy) {
    return { dismissalPolicy: { type: 'after', date: options.dismissalPolicy.after } }
  }

  return { dismissalPolicy: { type: 'immediate' } }
}

export const useLiveActivity = (
  variants: LiveActivityVariants,
  options?: UseLiveActivityOptions
): UseLiveActivityResult => {
  const [targetId, setTargetId] = useState<string | null>(() => {
    if (options?.activityName) {
      return isLiveActivityActive(options.activityName) ? options.activityName : null
    }

    return null
  })
  const isActive = targetId !== null
  const optionsRef = useRef(options)
  const variantsRef = useRef(variants)
  const lastUpdateOptionsRef = useRef<UpdateLiveActivityOptions | undefined>(undefined)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    variantsRef.current = variants
  }, [variants])

  useUpdateOnHMR()

  const start = useCallback(async (options?: StartLiveActivityOptions) => {
    const id = await startLiveActivity(variantsRef.current, { ...optionsRef.current, ...options })
    setTargetId(id)
  }, [])

  const update = useCallback(
    async (options?: UpdateLiveActivityOptions) => {
      if (!targetId) {
        return
      }

      const updateOptions = { ...optionsRef.current, ...options }
      lastUpdateOptionsRef.current = updateOptions
      await updateLiveActivity(targetId, variantsRef.current, updateOptions)
    },
    [targetId]
  )

  const end = useCallback(
    async (options?: EndLiveActivityOptions) => {
      if (!targetId) {
        return
      }

      await stopLiveActivity(targetId, options)
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
  }, [options?.autoUpdate, update, variants])

  useEffect(() => {
    if (!targetId) return

    const subscription = addVoltraListener('stateChange', (event) => {
      if (event.activityName !== targetId) return

      if (event.activityState === 'dismissed' || event.activityState === 'ended') {
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

export const startLiveActivity = async (
  variants: LiveActivityVariants,
  options?: StartLiveActivityOptions
): Promise<string> => {
  if (!assertRunningOnApple()) return Promise.resolve('')

  const payload = renderLiveActivityToString(variants)

  const normalizedSharedOptions = normalizeSharedLiveActivityOptions(options)
  const targetId = await VoltraModule.startLiveActivity(payload, {
    target: 'liveActivity',
    deepLinkUrl: options?.deepLinkUrl,
    activityId: options?.activityName,
    channelId: options?.channelId,
    ...normalizedSharedOptions,
  })
  return targetId
}

export const updateLiveActivity = async (
  targetId: string,
  variants: LiveActivityVariants,
  options?: UpdateLiveActivityOptions
): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const payload = renderLiveActivityToString(variants)

  const normalizedSharedOptions = normalizeSharedLiveActivityOptions(options)
  return VoltraModule.updateLiveActivity(targetId, payload, normalizedSharedOptions)
}

export const stopLiveActivity = async (targetId: string, options?: EndLiveActivityOptions): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const normalizedOptions = normalizeEndLiveActivityOptions(options)
  return VoltraModule.endLiveActivity(targetId, normalizedOptions)
}

export const isLiveActivityActive = (activityName: string): boolean => {
  if (!assertRunningOnApple()) return false

  return VoltraModule.isLiveActivityActive(activityName)
}

export async function endAllLiveActivities(): Promise<void> {
  if (!assertRunningOnApple()) return Promise.resolve()
  return VoltraModule.endAllLiveActivities()
}
