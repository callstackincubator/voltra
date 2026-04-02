import { useCallback, useEffect, useRef, useState } from 'react'

import { renderAndroidLiveUpdateToString, type AndroidLiveUpdateVariants } from '@use-voltra/android'

import VoltraModule from '../VoltraModule.js'
import { useUpdateOnHMR } from '../utils/index.js'
import type {
  StartAndroidLiveUpdateOptions,
  UpdateAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateResult,
} from './types.js'

export const useAndroidLiveUpdate = (
  variants: AndroidLiveUpdateVariants,
  options?: UseAndroidLiveUpdateOptions
): UseAndroidLiveUpdateResult => {
  const [targetId, setTargetId] = useState<string | null>(() => {
    if (options?.updateName) {
      return isAndroidLiveUpdateActive(options.updateName) ? options.updateName : null
    }
    return null
  })

  const isActive = targetId !== null
  const optionsRef = useRef(options)
  const variantsRef = useRef(variants)
  const lastUpdateOptionsRef = useRef<UpdateAndroidLiveUpdateOptions | undefined>(undefined)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    variantsRef.current = variants
  }, [variants])

  useUpdateOnHMR()

  const start = useCallback(async (options?: StartAndroidLiveUpdateOptions) => {
    const id = await startAndroidLiveUpdate(variantsRef.current, {
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
      await updateAndroidLiveUpdate(targetId, variantsRef.current, updateOptions)
    },
    [targetId]
  )

  const end = useCallback(async () => {
    if (!targetId) {
      return
    }

    await stopAndroidLiveUpdate(targetId)
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

export const startAndroidLiveUpdate = async (
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

export const updateAndroidLiveUpdate = async (
  notificationId: string,
  variants: AndroidLiveUpdateVariants,
  _options?: UpdateAndroidLiveUpdateOptions
): Promise<void> => {
  const payload = renderAndroidLiveUpdateToString(variants)

  return VoltraModule.updateAndroidLiveUpdate(notificationId, payload)
}

export const stopAndroidLiveUpdate = async (notificationId: string): Promise<void> => {
  return VoltraModule.stopAndroidLiveUpdate(notificationId)
}

export const isAndroidLiveUpdateActive = (updateName: string): boolean => {
  return VoltraModule.isAndroidLiveUpdateActive(updateName)
}

export async function endAllAndroidLiveUpdates(): Promise<void> {
  return VoltraModule.endAllAndroidLiveUpdates()
}
