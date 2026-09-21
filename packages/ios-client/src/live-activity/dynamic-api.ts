import { useCallback, useEffect, useRef, useState } from 'react'

import { addVoltraListener } from '../events.js'
import { assertRunningOnApple, useUpdateOnHMR } from '../utils/index.js'
import { getNativeVoltra } from '../VoltraModule.js'
import {
  isLiveActivityActive,
  normalizeSharedLiveActivityOptions,
  stopLiveActivity,
  type EndLiveActivityOptions,
  type SharedLiveActivityOptions,
} from './api.js'

/** @experimental A JSON-compatible value accepted as Dynamic Live Activity props. */
export type DynamicLiveActivityPropsValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<DynamicLiveActivityPropsValue>
  | Readonly<{ [key: string]: DynamicLiveActivityPropsValue }>

/** @experimental A complete JSON-compatible props record for a Dynamic Live Activity update. */
export type DynamicLiveActivityProps = Readonly<{ [key: string]: DynamicLiveActivityPropsValue }>

/** @experimental Options used to start a Dynamic Live Activity. */
export type StartDynamicLiveActivityOptions = {
  activityName?: string
  deepLinkUrl?: string
  channelId?: string
} & SharedLiveActivityOptions

/** @experimental Options used to update a Dynamic Live Activity. */
export type UpdateDynamicLiveActivityOptions = SharedLiveActivityOptions

/** @experimental Options for `useDynamicLiveActivity`. */
export type UseDynamicLiveActivityOptions = StartDynamicLiveActivityOptions & {
  autoStart?: boolean
  autoUpdate?: boolean
}

/** @experimental Lifecycle controls returned by `useDynamicLiveActivity`. */
export type UseDynamicLiveActivityResult = {
  start: (options?: StartDynamicLiveActivityOptions) => Promise<void>
  update: (options?: UpdateDynamicLiveActivityOptions) => Promise<void>
  end: (options?: EndLiveActivityOptions) => Promise<void>
  isActive: boolean
}

function serializeDynamicLiveActivityProps(props: DynamicLiveActivityProps): string {
  const ancestors = new Set<object>()

  const validate = (value: unknown, path: string): void => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TypeError(`Dynamic Live Activity props must be JSON-compatible; ${path} is not a finite number.`)
      }
      return
    }

    if (Array.isArray(value)) {
      if (ancestors.has(value)) {
        throw new TypeError(
          `Dynamic Live Activity props must be JSON-compatible; ${path} contains a circular reference.`
        )
      }
      ancestors.add(value)
      value.forEach((item, index) => validate(item, `${path}[${index}]`))
      ancestors.delete(value)
      return
    }

    if (typeof value === 'object') {
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`Dynamic Live Activity props must be JSON-compatible; ${path} must be a plain object.`)
      }
      if (ancestors.has(value)) {
        throw new TypeError(
          `Dynamic Live Activity props must be JSON-compatible; ${path} contains a circular reference.`
        )
      }
      ancestors.add(value)
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        validate(item, `${path}.${key}`)
      }
      ancestors.delete(value)
      return
    }

    throw new TypeError(
      `Dynamic Live Activity props must be JSON-compatible; ${path} has unsupported type ${typeof value}.`
    )
  }

  if (props === null || Array.isArray(props) || typeof props !== 'object') {
    throw new TypeError('Dynamic Live Activity props must be a JSON-compatible record.')
  }

  validate(props, 'props')
  return JSON.stringify(props)
}

/**
 * Starts a bundled Dynamic Live Activity with a complete opaque props record.
 * @experimental
 */
export async function startDynamicLiveActivity(
  definitionId: string,
  props: DynamicLiveActivityProps,
  options?: StartDynamicLiveActivityOptions
): Promise<string> {
  if (!assertRunningOnApple()) return ''

  const propsJson = serializeDynamicLiveActivityProps(props)
  const normalizedSharedOptions = normalizeSharedLiveActivityOptions(options)
  return getNativeVoltra().startDynamicLiveActivity(definitionId, propsJson, {
    target: 'liveActivity',
    deepLinkUrl: options?.deepLinkUrl,
    activityName: options?.activityName,
    channelId: options?.channelId,
    ...normalizedSharedOptions,
  })
}

/**
 * Replaces a Dynamic Live Activity's complete opaque props record.
 * @experimental
 */
export async function updateDynamicLiveActivity(
  activityName: string,
  props: DynamicLiveActivityProps,
  options?: UpdateDynamicLiveActivityOptions
): Promise<void> {
  if (!assertRunningOnApple()) return

  const propsJson = serializeDynamicLiveActivityProps(props)
  return getNativeVoltra().updateDynamicLiveActivity(
    activityName,
    propsJson,
    normalizeSharedLiveActivityOptions(options) ?? {}
  )
}

/**
 * Returns the Dynamic Live Activity definition IDs bundled in the installed app.
 * @experimental
 */
export async function getDynamicLiveActivityDefinitionIds(): Promise<string[]> {
  if (!assertRunningOnApple()) return []
  return getNativeVoltra().getDynamicLiveActivityDefinitionIds()
}

/**
 * Manages the lifecycle of one Dynamic Live Activity definition.
 *
 * Complete props are sent on every update. In development, call
 * `enableDynamicLiveActivityHotReload()` once in the app host to reload only
 * the definition changed by Fast Refresh.
 * @experimental
 */
export function useDynamicLiveActivity<Props extends DynamicLiveActivityProps = DynamicLiveActivityProps>(
  definitionId: string,
  props: Props,
  options?: UseDynamicLiveActivityOptions
): UseDynamicLiveActivityResult {
  const [activityName, setActivityName] = useState<string | null>(() => {
    if (options?.activityName) {
      return isLiveActivityActive(options.activityName) ? options.activityName : null
    }
    return null
  })
  const propsRef = useRef(props)
  const optionsRef = useRef(options)
  const lastUpdateOptionsRef = useRef<UpdateDynamicLiveActivityOptions | undefined>(undefined)

  useEffect(() => {
    propsRef.current = props
  }, [props])

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useUpdateOnHMR()

  const start = useCallback(
    async (startOptions?: StartDynamicLiveActivityOptions) => {
      const id = await startDynamicLiveActivity(definitionId, propsRef.current, {
        ...optionsRef.current,
        ...startOptions,
      })
      setActivityName(id)
    },
    [definitionId]
  )

  const update = useCallback(
    async (updateOptions?: UpdateDynamicLiveActivityOptions) => {
      if (!activityName) return

      const mergedOptions = { ...optionsRef.current, ...updateOptions }
      lastUpdateOptionsRef.current = mergedOptions
      await updateDynamicLiveActivity(activityName, propsRef.current, mergedOptions)
    },
    [activityName]
  )

  const end = useCallback(
    async (endOptions?: EndLiveActivityOptions) => {
      if (!activityName) return

      await stopLiveActivity(activityName, endOptions)
      setActivityName(null)
    },
    [activityName]
  )

  useEffect(() => {
    if (options?.autoStart) void start()
  }, [options?.autoStart, start])

  useEffect(() => {
    if (options?.autoUpdate) void update(lastUpdateOptionsRef.current)
  }, [options?.autoUpdate, props, update])

  useEffect(() => {
    if (!activityName) return

    const subscription = addVoltraListener('stateChange', (event) => {
      if (event.activityName !== activityName) return
      if (event.activityState === 'dismissed' || event.activityState === 'ended') setActivityName(null)
    })
    return () => subscription.remove()
  }, [activityName])

  return { start, update, end, isActive: activityName !== null }
}
