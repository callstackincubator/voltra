import type { ReactNode } from 'react'

import type { VoltraNodeJson } from '../types.js'

export type AndroidLiveUpdateVariants = {
  collapsed?: ReactNode
  expanded?: ReactNode
  smallIcon?: string
  channelId?: string
}

export type AndroidLiveUpdateVariantsJson = {
  v: number
  s?: Record<string, unknown>[]
  e?: VoltraNodeJson[]
  collapsed?: VoltraNodeJson
  expanded?: VoltraNodeJson
  smallIcon?: string
  channelId?: string
}

export type AndroidLiveUpdateJson = AndroidLiveUpdateVariantsJson

export type StartAndroidLiveUpdateOptions = {
  updateName?: string
  channelId?: string
}

export type UpdateAndroidLiveUpdateOptions = {
  // Currently no additional options, but keeping for future extensibility
}

export type UseAndroidLiveUpdateOptions = {
  updateName?: string
  autoStart?: boolean
  autoUpdate?: boolean
}

export type UseAndroidLiveUpdateResult = {
  start: (options?: StartAndroidLiveUpdateOptions) => Promise<void>
  update: (options?: UpdateAndroidLiveUpdateOptions) => Promise<void>
  end: () => Promise<void>
  isActive: boolean
}
