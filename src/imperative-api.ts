import { logger } from './logger'
import { ensurePayloadWithinBudget } from './payload'
import { renderVoltraToString, VoltraVariants } from './renderer'
import { assertRunningOnApple } from './utils'
import VoltraModule from './VoltraModule'

export type SharedVoltraOptions = {
  /**
   * Unix timestamp in milliseconds
   */
  staleDate?: number
  /**
   * Double value between 0.0 and 1.0
   * @default 0.0
   */
  relevanceScore?: number
}

export type StartVoltraOptions = {
  /**
   * The unique identifier of the Live Activity.
   * Allows you to rebind to the same activity on app restart.
   */
  activityId?: string
  /**
   * URL to open when the Live Activity is tapped.
   */
  deepLinkUrl?: string
} & SharedVoltraOptions

export type UpdateVoltraOptions = SharedVoltraOptions

const normalizeSharedVoltraOptions = (options?: SharedVoltraOptions): SharedVoltraOptions | undefined => {
  if (!options) return undefined

  const normalizedOptions: SharedVoltraOptions = {}

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

export const startVoltra = async (variants: VoltraVariants, options?: StartVoltraOptions): Promise<string> => {
  if (!assertRunningOnApple()) return Promise.resolve('')

  const payload = renderVoltraToString(variants)
  ensurePayloadWithinBudget(payload)

  const normalizedSharedOptions = normalizeSharedVoltraOptions(options)
  const targetId = await VoltraModule.startVoltra(payload, {
    target: 'liveActivity',
    deepLinkUrl: options?.deepLinkUrl,
    activityId: options?.activityId,
    ...normalizedSharedOptions,
  })
  return targetId
}

export const updateVoltra = async (
  targetId: string,
  variants: VoltraVariants,
  options?: UpdateVoltraOptions
): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const payload = renderVoltraToString(variants)
  ensurePayloadWithinBudget(payload)

  const normalizedSharedOptions = normalizeSharedVoltraOptions(options)
  return VoltraModule.updateVoltra(targetId, payload, normalizedSharedOptions)
}

export const stopVoltra = async (targetId: string): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.endVoltra(targetId)
}

export const isVoltraActive = (targetId: string): boolean => {
  if (!assertRunningOnApple()) return false

  return VoltraModule.isVoltraActive(targetId)
}
