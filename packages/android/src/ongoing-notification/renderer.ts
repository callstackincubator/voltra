import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'

import type { ImageSource } from '../jsx/Image.js'
import { getAndroidComponentId } from '../payload/component-ids.js'
import { ANDROID_ONGOING_NOTIFICATION_COMPONENT_TAG } from './components.js'
import type {
  AndroidOngoingNotificationActionPayload,
  AndroidOngoingNotificationActionProps,
  AndroidOngoingNotificationBigTextPayload,
  AndroidOngoingNotificationBigTextProps,
  AndroidOngoingNotificationCommonDisplayProps,
  AndroidOngoingNotificationContent,
  AndroidOngoingNotificationMetricPayload,
  AndroidOngoingNotificationMetricProps,
  AndroidOngoingNotificationMetricSemanticStyle,
  AndroidOngoingNotificationMetricValuePayload,
  AndroidOngoingNotificationPayload,
  AndroidOngoingNotificationProgressPayload,
  AndroidOngoingNotificationProgressPoint,
  AndroidOngoingNotificationProgressProps,
  AndroidOngoingNotificationProgressSegment,
} from './types.js'

void getAndroidComponentId

const PAYLOAD_VERSION = 1 as const

const flattenChildren = (node: ReactNode): ReactNode[] => {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenChildren(child))
  }

  return [node]
}

const getSingleRootElement = (content: ReactNode): ReactElement<Record<string, unknown>> => {
  const children = flattenChildren(content)

  if (children.length !== 1) {
    throw new Error('[Voltra] [Android] Ongoing notification content must contain exactly one root element.')
  }

  const [root] = children

  if (!isValidElement(root)) {
    throw new Error(
      '[Voltra] [Android] Ongoing notification content must be a valid AndroidOngoingNotification element.'
    )
  }

  if (root.type === Fragment) {
    return getSingleRootElement((root.props as { children?: ReactNode }).children)
  }

  return root as ReactElement<Record<string, unknown>>
}

const assertString = (value: unknown, propName: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a non-empty string.`)
  }

  return value
}

const assertOptionalNonEmptyString = (value: unknown, propName: string): string | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `[Voltra] [Android] Ongoing notification prop "${propName}" must be a non-empty string when provided.`
    )
  }

  return value
}

const assertOptionalString = (value: unknown, propName: string): string | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a string.`)
  }

  return value
}

const isImageSource = (value: unknown): value is ImageSource => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const keys = Object.keys(value)
  if (keys.length !== 1) {
    return false
  }

  if ('assetName' in value) {
    return typeof value.assetName === 'string' && value.assetName.length > 0
  }

  if ('base64' in value) {
    return typeof value.base64 === 'string' && value.base64.length > 0
  }

  return false
}

const assertOptionalImageSource = (value: unknown, propName: string): ImageSource | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (!isImageSource(value)) {
    throw new Error(
      `[Voltra] [Android] Ongoing notification prop "${propName}" must be an image source with either assetName or base64.`
    )
  }

  return value
}

const assertBoolean = (value: unknown, propName: string): boolean | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a boolean.`)
  }

  return value
}

const assertFiniteNumber = (value: unknown, propName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a finite number.`)
  }

  return value
}

const assertOptionalColorString = (value: unknown, propName: string): string | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a non-empty color string.`)
  }

  return value
}

const normalizeProgressSegments = (value: unknown): AndroidOngoingNotificationProgressSegment[] | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error('[Voltra] [Android] Ongoing notification prop "segments" must be an array.')
  }

  return value.map((segment, index) => {
    if (!segment || typeof segment !== 'object' || Array.isArray(segment)) {
      throw new Error(`[Voltra] [Android] Ongoing notification prop "segments[${index}]" must be an object.`)
    }

    const length = assertFiniteNumber((segment as { length?: unknown }).length, `segments[${index}].length`)
    if (length <= 0) {
      throw new Error(
        `[Voltra] [Android] Ongoing notification prop "segments[${index}].length" must be greater than 0.`
      )
    }

    return {
      length,
      color: assertOptionalColorString((segment as { color?: unknown }).color, `segments[${index}].color`),
    }
  })
}

const normalizeProgressPoints = (value: unknown): AndroidOngoingNotificationProgressPoint[] | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error('[Voltra] [Android] Ongoing notification prop "points" must be an array.')
  }

  return value.map((point, index) => {
    if (!point || typeof point !== 'object' || Array.isArray(point)) {
      throw new Error(`[Voltra] [Android] Ongoing notification prop "points[${index}]" must be an object.`)
    }

    const position = assertFiniteNumber((point as { position?: unknown }).position, `points[${index}].position`)
    if (position < 0) {
      throw new Error(
        `[Voltra] [Android] Ongoing notification prop "points[${index}].position" must be greater than or equal to 0.`
      )
    }

    return {
      position,
      color: assertOptionalColorString((point as { color?: unknown }).color, `points[${index}].color`),
    }
  })
}

const normalizeEpoch = (value: unknown, propName: string): number => {
  if (value instanceof Date) {
    const timestamp = value.getTime()
    if (!Number.isFinite(timestamp)) {
      throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a valid Date or timestamp.`)
    }

    return timestamp
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a valid Date or timestamp.`)
}

const normalizeWhen = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined
  }

  return normalizeEpoch(value, 'when')
}

// `true` keeps meaning "count up" for payloads and props written before the
// chip gained a direction; only 'countDown' sets chronometerCountDown, and a
// countdown without `when` has nothing to count down to.
const normalizeChronometer = (
  value: unknown,
  when: number | undefined
): { chronometer?: boolean; chronometerCountDown?: boolean } => {
  if (value === undefined) {
    return {}
  }

  if (typeof value === 'boolean') {
    return { chronometer: value }
  }

  if (value === 'countUp') {
    return { chronometer: true }
  }

  if (value === 'countDown') {
    if (when === undefined) {
      throw new Error(
        '[Voltra] [Android] Ongoing notification prop "chronometer" set to "countDown" requires the "when" prop.'
      )
    }

    return { chronometer: true, chronometerCountDown: true }
  }

  throw new Error(
    '[Voltra] [Android] Ongoing notification prop "chronometer" must be a boolean, "countUp" or "countDown".'
  )
}

const getElementKind = (element: ReactElement<Record<string, unknown>>) => {
  const elementType = element.type as unknown

  return typeof elementType === 'function' || (typeof elementType === 'object' && elementType !== null)
    ? (elementType as Record<PropertyKey, unknown>)[ANDROID_ONGOING_NOTIFICATION_COMPONENT_TAG]
    : undefined
}

const normalizeActionPayload = (
  props: AndroidOngoingNotificationActionProps
): AndroidOngoingNotificationActionPayload => {
  return {
    title: assertString(props.title, 'title'),
    deepLinkUrl: assertString(props.deepLinkUrl, 'deepLinkUrl'),
    icon: assertOptionalImageSource(props.icon, 'icon'),
  }
}

const normalizeCommonDisplayFields = (
  props: AndroidOngoingNotificationCommonDisplayProps & { largeIcon?: ImageSource }
): {
  title?: string
  subText?: string
  shortCriticalText?: string
  when?: number
  chronometer?: boolean
  chronometerCountDown?: boolean
  largeIcon?: ImageSource
} => {
  const when = normalizeWhen(props.when)

  return {
    title: assertOptionalNonEmptyString(props.title, 'title'),
    subText: assertOptionalString(props.subText, 'subText'),
    shortCriticalText: assertOptionalString(props.shortCriticalText, 'shortCriticalText'),
    when,
    ...normalizeChronometer(props.chronometer, when),
    largeIcon: assertOptionalImageSource(props.largeIcon, 'largeIcon'),
  }
}

const normalizeActions = (value: ReactNode): AndroidOngoingNotificationActionPayload[] | undefined => {
  const actions: AndroidOngoingNotificationActionPayload[] = []

  Children.forEach(value, (child) => {
    if (!isValidElement(child)) {
      return
    }

    if (child.type === Fragment) {
      const fragmentChildren = normalizeActions((child.props as { children?: ReactNode }).children)
      if (fragmentChildren) {
        actions.push(...fragmentChildren)
      }
      return
    }

    if (getElementKind(child as ReactElement<Record<string, unknown>>) !== 'action') {
      return
    }

    actions.push(normalizeActionPayload(child.props as AndroidOngoingNotificationActionProps))
  })

  return actions.length > 0 ? actions : undefined
}

const normalizeProgressPayload = (
  props: AndroidOngoingNotificationProgressProps
): AndroidOngoingNotificationProgressPayload => {
  const value = assertFiniteNumber(props.value, 'value')
  const max = assertFiniteNumber(props.max, 'max')

  if (max <= 0) {
    throw new Error('[Voltra] [Android] Ongoing notification prop "max" must be greater than 0.')
  }

  if (value < 0 || value > max) {
    throw new Error('[Voltra] [Android] Ongoing notification prop "value" must be between 0 and max.')
  }

  return {
    v: PAYLOAD_VERSION,
    kind: 'progress',
    ...normalizeCommonDisplayFields(props),
    text: assertOptionalString(props.text, 'text'),
    value,
    max,
    indeterminate: assertBoolean(props.indeterminate, 'indeterminate'),
    progressTrackerIcon: assertOptionalImageSource(props.progressTrackerIcon, 'progressTrackerIcon'),
    progressStartIcon: assertOptionalImageSource(props.progressStartIcon, 'progressStartIcon'),
    progressEndIcon: assertOptionalImageSource(props.progressEndIcon, 'progressEndIcon'),
    segments: normalizeProgressSegments(props.segments),
    points: normalizeProgressPoints(props.points),
    actions: normalizeActions(props.children),
  }
}

const normalizeBigTextPayload = (
  props: AndroidOngoingNotificationBigTextProps
): AndroidOngoingNotificationBigTextPayload => {
  const text = assertString(props.text, 'text')

  return {
    v: PAYLOAD_VERSION,
    kind: 'bigText',
    ...normalizeCommonDisplayFields(props),
    text,
    bigText: assertOptionalString(props.bigText, 'bigText') ?? text,
    actions: normalizeActions(props.children),
  }
}

const METRIC_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

const METRIC_SEMANTIC_STYLES = ['unspecified', 'info', 'safe', 'caution', 'danger'] as const

const METRIC_TIME_FORMATS = ['adaptive', 'chronometer'] as const

const assertMetricNonEmptyString = (value: unknown, propName: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be a non-empty string.`)
  }

  return value
}

const normalizeMetricTimeFormat = (value: unknown, propName: string) => {
  if (value === undefined) {
    return undefined
  }

  if (!(METRIC_TIME_FORMATS as readonly unknown[]).includes(value)) {
    throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}" must be "adaptive" or "chronometer".`)
  }

  return value as (typeof METRIC_TIME_FORMATS)[number]
}

const normalizeMetricValue = (
  value: unknown,
  unit: unknown,
  propName: string
): AndroidOngoingNotificationMetricValuePayload => {
  const topLevelUnit = assertOptionalString(unit, `${propName}.unit`)
  const rejectTopLevelUnit = () => {
    if (topLevelUnit !== undefined) {
      throw new Error(
        `[Voltra] [Android] Ongoing notification prop "${propName}.unit" only applies to "int", "float" and "text" values.`
      )
    }
  }

  // Shorthands: an integer reads as int, any other number as float, a string as text.
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}.value" must be a finite number.`)
    }

    return Number.isInteger(value)
      ? { type: 'int', value, unit: topLevelUnit }
      : { type: 'float', value, unit: topLevelUnit }
  }

  if (typeof value === 'string') {
    return { type: 'text', value: assertMetricNonEmptyString(value, `${propName}.value`), unit: topLevelUnit }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `[Voltra] [Android] Ongoing notification prop "${propName}.value" must be a number, a string, or a metric value object.`
    )
  }

  const source = value as Record<string, unknown>
  const type = source.type

  switch (type) {
    case 'int': {
      const numberValue = assertFiniteNumber(source.value, `${propName}.value`)
      if (!Number.isInteger(numberValue)) {
        throw new Error(`[Voltra] [Android] Ongoing notification prop "${propName}.value" must be an integer.`)
      }

      return {
        type: 'int',
        value: numberValue,
        unit: assertOptionalString(source.unit, `${propName}.unit`) ?? topLevelUnit,
      }
    }
    case 'float': {
      const numberValue = assertFiniteNumber(source.value, `${propName}.value`)
      const min = source.min === undefined ? undefined : assertFiniteNumber(source.min, `${propName}.min`)
      const max = source.max === undefined ? undefined : assertFiniteNumber(source.max, `${propName}.max`)

      if (min !== undefined && min < 0) {
        throw new Error(
          `[Voltra] [Android] Ongoing notification prop "${propName}.min" must be greater than or equal to 0.`
        )
      }

      if (max !== undefined && max < 0) {
        throw new Error(
          `[Voltra] [Android] Ongoing notification prop "${propName}.max" must be greater than or equal to 0.`
        )
      }

      if (min !== undefined && max !== undefined && min > max) {
        throw new Error(
          `[Voltra] [Android] Ongoing notification prop "${propName}.min" must not exceed "${propName}.max".`
        )
      }

      let fractionDigits: number | undefined
      if (source.fractionDigits !== undefined) {
        fractionDigits = assertFiniteNumber(source.fractionDigits, `${propName}.fractionDigits`)
        if (!Number.isInteger(fractionDigits) || fractionDigits < 0) {
          throw new Error(
            `[Voltra] [Android] Ongoing notification prop "${propName}.fractionDigits" must be an integer greater than or equal to 0.`
          )
        }
      }

      return {
        type: 'float',
        value: numberValue,
        unit: assertOptionalString(source.unit, `${propName}.unit`) ?? topLevelUnit,
        min,
        max,
        fractionDigits,
      }
    }
    case 'text':
      return {
        type: 'text',
        value: assertMetricNonEmptyString(source.value, `${propName}.value`),
        unit: assertOptionalString(source.unit, `${propName}.unit`) ?? topLevelUnit,
      }
    case 'time': {
      rejectTopLevelUnit()
      const timeValue = assertMetricNonEmptyString(source.value, `${propName}.value`)
      if (!METRIC_TIME_PATTERN.test(timeValue)) {
        throw new Error(
          `[Voltra] [Android] Ongoing notification prop "${propName}.value" must be a time in "HH:mm" or "HH:mm:ss" form.`
        )
      }

      return { type: 'time', value: timeValue }
    }
    case 'timer':
      rejectTopLevelUnit()
      return {
        type: 'timer',
        endsAt: normalizeEpoch(source.endsAt, `${propName}.endsAt`),
        format: normalizeMetricTimeFormat(source.format, `${propName}.format`),
      }
    case 'stopwatch':
      rejectTopLevelUnit()
      return {
        type: 'stopwatch',
        startedAt: normalizeEpoch(source.startedAt, `${propName}.startedAt`),
        format: normalizeMetricTimeFormat(source.format, `${propName}.format`),
      }
    case 'pausedTimer': {
      rejectTopLevelUnit()
      const remainingMillis = assertFiniteNumber(source.remainingMillis, `${propName}.remainingMillis`)
      if (remainingMillis < 0) {
        throw new Error(
          `[Voltra] [Android] Ongoing notification prop "${propName}.remainingMillis" must be greater than or equal to 0.`
        )
      }

      return { type: 'pausedTimer', remainingMillis }
    }
    case 'pausedStopwatch': {
      rejectTopLevelUnit()
      const elapsedMillis = assertFiniteNumber(source.elapsedMillis, `${propName}.elapsedMillis`)
      if (elapsedMillis < 0) {
        throw new Error(
          `[Voltra] [Android] Ongoing notification prop "${propName}.elapsedMillis" must be greater than or equal to 0.`
        )
      }

      return { type: 'pausedStopwatch', elapsedMillis }
    }
    default:
      throw new Error(
        `[Voltra] [Android] Ongoing notification prop "${propName}.type" must be "int", "float", "text", "time", "timer", "stopwatch", "pausedTimer", or "pausedStopwatch".`
      )
  }
}

const normalizeMetricPayload = (
  props: AndroidOngoingNotificationMetricProps
): AndroidOngoingNotificationMetricPayload => {
  if (!Array.isArray(props.metrics)) {
    throw new Error('[Voltra] [Android] Ongoing notification prop "metrics" must be an array.')
  }

  if (props.metrics.length < 1 || props.metrics.length > 3) {
    throw new Error('[Voltra] [Android] Ongoing notification prop "metrics" must contain between 1 and 3 metrics.')
  }

  const metrics = props.metrics.map((descriptor, index) => {
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
      throw new Error(`[Voltra] [Android] Ongoing notification prop "metrics[${index}]" must be an object.`)
    }

    const label = assertMetricNonEmptyString(descriptor.label, `metrics[${index}].label`)
    if (label.length > 10) {
      throw new Error(
        `[Voltra] [Android] Ongoing notification prop "metrics[${index}].label" must be at most 10 characters long.`
      )
    }

    return { label, value: normalizeMetricValue(descriptor.value, descriptor.unit, `metrics[${index}]`) }
  })

  let criticalMetric: number | undefined
  if (props.criticalMetric !== undefined) {
    criticalMetric = assertFiniteNumber(props.criticalMetric, 'criticalMetric')
    if (!Number.isInteger(criticalMetric) || criticalMetric < 0 || criticalMetric >= metrics.length) {
      throw new Error(
        `[Voltra] [Android] Ongoing notification prop "criticalMetric" must be an index between 0 and ${
          metrics.length - 1
        }.`
      )
    }
  }

  let semanticStyle: AndroidOngoingNotificationMetricSemanticStyle | undefined
  if (props.semanticStyle !== undefined) {
    if (!(METRIC_SEMANTIC_STYLES as readonly string[]).includes(props.semanticStyle)) {
      throw new Error(
        '[Voltra] [Android] Ongoing notification prop "semanticStyle" must be "unspecified", "info", "safe", "caution", or "danger".'
      )
    }

    semanticStyle = props.semanticStyle
  }

  return {
    v: PAYLOAD_VERSION,
    kind: 'metric',
    ...normalizeCommonDisplayFields(props),
    metrics,
    criticalMetric,
    semanticStyle,
    actions: normalizeActions(props.children),
  }
}

export const renderAndroidOngoingNotificationPayloadToJson = (
  content: ReactNode
): AndroidOngoingNotificationPayload => {
  const element = getSingleRootElement(content)
  const kind = getElementKind(element)

  if (kind === 'progress') {
    return normalizeProgressPayload(element.props as AndroidOngoingNotificationProgressProps)
  }

  if (kind === 'bigText') {
    return normalizeBigTextPayload(element.props as AndroidOngoingNotificationBigTextProps)
  }

  if (kind === 'metric') {
    return normalizeMetricPayload(element.props as AndroidOngoingNotificationMetricProps)
  }

  throw new Error(
    '[Voltra] [Android] Ongoing notification content must use AndroidOngoingNotification.Progress, AndroidOngoingNotification.BigText, or AndroidOngoingNotification.Metric.'
  )
}

export const renderAndroidOngoingNotificationPayload = (content: ReactNode): string => {
  return JSON.stringify(renderAndroidOngoingNotificationPayloadToJson(content))
}

export const renderAndroidOngoingNotificationContent = (content: AndroidOngoingNotificationContent): string => {
  return renderAndroidOngoingNotificationPayload(content)
}
