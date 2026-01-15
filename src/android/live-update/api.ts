import { useCallback, useEffect, useRef, useState } from 'react'

import { useUpdateOnHMR } from '../../utils/index.js'
import VoltraModule from '../../VoltraModule.js'
import { renderAndroidLiveUpdateToString } from './renderer.js'
import type {
  AndroidLiveUpdateVariants,
  StartAndroidLiveUpdateOptions,
  UpdateAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateResult,
} from './types.js'

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * React hook for managing Android Live Updates with automatic lifecycle handling.
 *
 * @param variants - The Android Live Update content variants to display
 * @param options - Configuration options for the hook
 * @returns Object with start, update, end methods and isActive state
 *
 * @example
 * ```tsx
 * import { VoltraAndroid, unstable_useAndroidLiveUpdate } from 'voltra'
 *
 * const MyLiveUpdate = () => {
 *   const { start, update, end, isActive } = unstable_useAndroidLiveUpdate({
 *     collapsed: <VoltraAndroid.Text>Delivery arriving</VoltraAndroid.Text>,
 *     expanded: <VoltraAndroid.Column>...</VoltraAndroid.Column>,
 *     channelId: 'delivery_updates',
 *   }, {
 *     updateName: 'my-live-update',
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
export const unstable_useAndroidLiveUpdate = (
  variants: AndroidLiveUpdateVariants,
  options?: UseAndroidLiveUpdateOptions
): UseAndroidLiveUpdateResult => {
  const [targetId, setTargetId] = useState<string | null>(() => {
    if (options?.updateName) {
      return unstable_isAndroidLiveUpdateActive(options.updateName) ? options.updateName : null
    }
    return null
  })

  const isActive = targetId !== null
  const optionsRef = useRef(options)
  const variantsRef = useRef(variants)
  const lastUpdateOptionsRef = useRef<UpdateAndroidLiveUpdateOptions | undefined>(undefined)

  // Update refs when values change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    variantsRef.current = variants
  }, [variants])

  useUpdateOnHMR()

  const start = useCallback(async (options?: StartAndroidLiveUpdateOptions) => {
    const id = await unstable_startAndroidLiveUpdate(variantsRef.current, {
      ...optionsRef.current,
      ...options,
    })
    setTargetId(id)
  }, [])

  const update = useCallback(
    async (options?: UpdateAndroidLiveUpdateOptions) => {
      if (!targetId) {
        return
      }

      const updateOptions = { ...optionsRef.current, ...options }
      lastUpdateOptionsRef.current = updateOptions
      await unstable_updateAndroidLiveUpdate(targetId, variantsRef.current, updateOptions)
    },
    [targetId]
  )

  const end = useCallback(async () => {
    if (!targetId) {
      return
    }

    await unstable_stopAndroidLiveUpdate(targetId)
    setTargetId(null)
  }, [targetId])

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

  return {
    start,
    update,
    end,
    isActive,
  }
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * Start a new Android Live Update with the provided content variants.
 *
 * @param variants - The Android Live Update content variants to display
 * @param options - Configuration options for the Live Update
 * @returns Promise resolving to the notification ID
 *
 * @example
 * ```tsx
 * import { VoltraAndroid, unstable_startAndroidLiveUpdate } from 'voltra'
 *
 * const notificationId = await unstable_startAndroidLiveUpdate({
 *   collapsed: <VoltraAndroid.Text>Delivery arriving</VoltraAndroid.Text>,
 *   expanded: <VoltraAndroid.Column>...</VoltraAndroid.Column>,
 *   channelId: 'delivery_updates',
 * }, {
 *   updateName: 'my-live-update',
 * })
 * ```
 */
export const unstable_startAndroidLiveUpdate = async (
  variants: AndroidLiveUpdateVariants,
  options?: StartAndroidLiveUpdateOptions
): Promise<string> => {
  const payload = renderAndroidLiveUpdateToString(variants)

  const notificationId = await VoltraModule.startAndroidLiveUpdate(payload, {
    updateName: options?.updateName,
    channelId: options?.channelId || variants.channelId || 'voltra_live_updates',
  })

  return notificationId
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * Update an existing Android Live Update with new content.
 *
 * @param notificationId - The ID of the notification to update
 * @param variants - The new Android Live Update content variants
 * @param options - Update options
 *
 * @example
 * ```tsx
 * import { VoltraAndroid, unstable_updateAndroidLiveUpdate } from 'voltra'
 *
 * await unstable_updateAndroidLiveUpdate('notification-123', {
 *   collapsed: <VoltraAndroid.Text>Updated: Delivery arriving</VoltraAndroid.Text>,
 *   expanded: <VoltraAndroid.Column>...</VoltraAndroid.Column>,
 * })
 * ```
 */
export const unstable_updateAndroidLiveUpdate = async (
  notificationId: string,
  variants: AndroidLiveUpdateVariants,
  options?: UpdateAndroidLiveUpdateOptions
): Promise<void> => {
  const payload = renderAndroidLiveUpdateToString(variants)

  return VoltraModule.updateAndroidLiveUpdate(notificationId, payload)
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * Stop an Android Live Update and dismiss the notification.
 *
 * @param notificationId - The ID of the notification to stop
 *
 * @example
 * ```tsx
 * import { unstable_stopAndroidLiveUpdate } from 'voltra'
 *
 * await unstable_stopAndroidLiveUpdate('notification-123')
 * ```
 */
export const unstable_stopAndroidLiveUpdate = async (notificationId: string): Promise<void> => {
  return VoltraModule.stopAndroidLiveUpdate(notificationId)
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * Check if an Android Live Update with the given name is currently active.
 *
 * @param updateName - The name of the Live Update to check
 * @returns true if the update is active, false otherwise
 *
 * @example
 * ```tsx
 * import { unstable_isAndroidLiveUpdateActive } from 'voltra'
 *
 * if (unstable_isAndroidLiveUpdateActive('my-live-update')) {
 *   console.log('Update is running')
 * }
 * ```
 */
export const unstable_isAndroidLiveUpdateActive = (updateName: string): boolean => {
  return VoltraModule.isAndroidLiveUpdateActive(updateName)
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * End all active Android Live Updates.
 *
 * This function stops and dismisses all currently running Live Updates in the app.
 *
 * @example
 * ```tsx
 * import { unstable_endAllAndroidLiveUpdates } from 'voltra'
 *
 * await unstable_endAllAndroidLiveUpdates()
 * ```
 */
export async function unstable_endAllAndroidLiveUpdates(): Promise<void> {
  return VoltraModule.endAllAndroidLiveUpdates()
}
