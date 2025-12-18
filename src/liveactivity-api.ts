import { useCallback, useEffect, useRef, useState } from 'react'

import { addVoltraListener } from './events'
import { logger } from './logger'
import { renderVoltraToString, VoltraVariants } from './renderer'
import type { DismissalPolicy } from './types'
import { assertRunningOnApple, useUpdateOnHMR } from './utils'
import VoltraModule from './VoltraModule'

export type SharedLiveActivityOptions = {
  /**
   * Unix timestamp in milliseconds
   */
  staleDate?: number
  /**
   * Double value between 0.0 and 1.0
   * @default 0.0
   */
  relevanceScore?: number
  /**
   * How the Live Activity should be dismissed after ending
   * @default 'immediate'
   */
  dismissalPolicy?: DismissalPolicy
}

export type StartLiveActivityOptions = {
  /**
   * The name of the Live Activity.
   * Allows you to rebind to the same activity on app restart.
   */
  activityName?: string
  /**
   * URL to open when the Live Activity is tapped.
   */
  deepLinkUrl?: string
} & SharedLiveActivityOptions

export type UpdateLiveActivityOptions = SharedLiveActivityOptions

export type EndLiveActivityOptions = {
  dismissalPolicy?: DismissalPolicy
}

export type UseLiveActivityOptions = {
  /**
   * The name of the Live Activity.
   * Allows you to rebind to the same activity on app restart.
   */
  activityName?: string
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

  // Always include relevanceScore, defaulting to 0.0 if not provided
  const relevanceScore = options.relevanceScore ?? 0.0
  if (relevanceScore < 0 || relevanceScore > 1) {
    logger.warn('Ignoring relevanceScore because it is out of range [0.0, 1.0], using default 0.0')
    normalizedOptions.relevanceScore = 0.0
  } else {
    normalizedOptions.relevanceScore = relevanceScore
  }

  return Object.keys(normalizedOptions).length > 0 ? normalizedOptions : undefined
}

/**
 * React hook for managing Live Activities with automatic lifecycle handling.
 *
 * @param variants - The Live Activity content variants to display
 * @param options - Configuration options for the hook
 * @returns Object with start, update, end methods and isActive state
 *
 * @example
 * ```tsx
 * import { useLiveActivity, Voltra } from 'voltra'
 *
 * const MyLiveActivity = () => {
 *   const { start, update, end, isActive } = useLiveActivity({
 *     minimal: <Voltra.Text>Live Activity</Voltra.Text>,
 *     compact: <Voltra.HStack>...</Voltra.HStack>,
 *     expanded: <Voltra.VStack>...</Voltra.VStack>
 *   }, {
 *     activityName: 'my-activity',
 *     autoStart: true,
 *     autoUpdate: true
 *   })
 *
 *   return (
 *     <View>
 *       <Button title={isActive ? "Stop" : "Start"} onPress={isActive ? end : start} />
 *     </View>
 *   )
 * }
 * ```
 */
export const useLiveActivity = (variants: VoltraVariants, options?: UseLiveActivityOptions): UseLiveActivityResult => {
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

  // Update refs when values change
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

/**
 * Start a new Live Activity with the provided content variants.
 *
 * @param variants - The Live Activity content variants to display
 * @param options - Configuration options for the Live Activity
 * @returns Promise resolving to the activity ID
 *
 * @example
 * ```tsx
 * import { startLiveActivity, Voltra } from 'voltra'
 *
 * const activityId = await startLiveActivity({
 *   minimal: <Voltra.Text>Live Activity</Voltra.Text>,
 *   compact: <Voltra.HStack>...</Voltra.HStack>,
 *   expanded: <Voltra.VStack>...</Voltra.VStack>
 * }, {
 *   activityName: 'my-activity',
 *   deepLinkUrl: '/details',
 *   relevanceScore: 0.8
 * })
 * ```
 */
export const startLiveActivity = async (
  variants: VoltraVariants,
  options?: StartLiveActivityOptions
): Promise<string> => {
  if (!assertRunningOnApple()) return Promise.resolve('')

  const payload = renderVoltraToString(variants)

  const normalizedSharedOptions = normalizeSharedLiveActivityOptions(options)
  const targetId = await VoltraModule.startLiveActivity(payload, {
    target: 'liveActivity',
    deepLinkUrl: options?.deepLinkUrl,
    activityId: options?.activityName,
    ...normalizedSharedOptions,
  })
  return targetId
}

/**
 * Update an existing Live Activity with new content.
 *
 * @param targetId - The ID of the Live Activity to update
 * @param variants - The new Live Activity content variants
 * @param options - Update options like relevance score
 *
 * @example
 * ```tsx
 * import { updateLiveActivity, Voltra } from 'voltra'
 *
 * await updateLiveActivity('activity-123', {
 *   minimal: <Voltra.Text>Updated: Live Activity</Voltra.Text>,
 *   compact: <Voltra.HStack>...</Voltra.HStack>,
 *   expanded: <Voltra.VStack>...</Voltra.VStack>
 * }, {
 *   relevanceScore: 0.9
 * })
 * ```
 */
export const updateLiveActivity = async (
  targetId: string,
  variants: VoltraVariants,
  options?: UpdateLiveActivityOptions
): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const payload = renderVoltraToString(variants)

  const normalizedSharedOptions = normalizeSharedLiveActivityOptions(options)
  return VoltraModule.updateLiveActivity(targetId, payload, normalizedSharedOptions)
}

/**
 * Stop a Live Activity.
 *
 * @param targetId - The ID of the Live Activity to stop
 * @param options - Options for how to end the activity
 *
 * @example
 * ```tsx
 * import { stopLiveActivity } from 'voltra'
 *
 * await stopLiveActivity('activity-123', { dismissalPolicy: 'afterDate' })
 * ```
 */
export const stopLiveActivity = async (targetId: string, options?: EndLiveActivityOptions): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.endLiveActivity(targetId, options)
}

/**
 * Check if a Live Activity with the given name is currently active.
 *
 * @param activityName - The name of the Live Activity to check
 * @returns true if the activity is active, false otherwise
 *
 * @example
 * ```tsx
 * import { isLiveActivityActive } from 'voltra'
 *
 * if (isLiveActivityActive('my-activity')) {
 *   console.log('Activity is running')
 * }
 * ```
 */
export const isLiveActivityActive = (activityName: string): boolean => {
  if (!assertRunningOnApple()) return false

  return VoltraModule.isLiveActivityActive(activityName)
}

/**
 * End all active Live Activities.
 *
 * This function stops and dismisses all currently running Live Activities in the app.
 * It's useful for cleanup operations, such as when the app is being closed or
 * when you want to reset all Live Activity states.
 *
 * @example
 * ```typescript
 * import { endAllLiveActivities } from 'voltra'
 *
 * // End all active Live Activities
 * await endAllLiveActivities()
 * ```
 */
export async function endAllLiveActivities(): Promise<void> {
  if (!assertRunningOnApple()) return Promise.resolve()
  return VoltraModule.endAllLiveActivities()
}
