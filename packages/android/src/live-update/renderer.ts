import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'

import { getAndroidComponentId } from '../payload/component-ids.js'
import type {
  AndroidOngoingNotificationActionPayload,
  AndroidOngoingNotificationActionProps,
  AndroidOngoingNotificationBigTextPayload,
  AndroidOngoingNotificationBigTextProps,
  AndroidOngoingNotificationContent,
  AndroidOngoingNotificationPayload,
  AndroidOngoingNotificationProgressPayload,
  AndroidOngoingNotificationProgressPoint,
  AndroidOngoingNotificationProgressProps,
  AndroidOngoingNotificationProgressSegment,
} from './types.js'

import { ANDROID_ONGOING_NOTIFICATION_COMPONENT_TAG } from './components.js'
import type { ImageSource } from '../jsx/Image.js'

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

const normalizeWhen = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (value instanceof Date) {
    const timestamp = value.getTime()
    if (!Number.isFinite(timestamp)) {
      throw new Error('[Voltra] [Android] Ongoing notification prop "when" must be a valid Date or timestamp.')
    }

    return timestamp
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  throw new Error('[Voltra] [Android] Ongoing notification prop "when" must be a valid Date or timestamp.')
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
    title: assertOptionalNonEmptyString(props.title, 'title'),
    subText: assertOptionalString(props.subText, 'subText'),
    text: assertOptionalString(props.text, 'text'),
    value,
    max,
    indeterminate: assertBoolean(props.indeterminate, 'indeterminate'),
    shortCriticalText: assertOptionalString(props.shortCriticalText, 'shortCriticalText'),
    when: normalizeWhen(props.when),
    chronometer: assertBoolean(props.chronometer, 'chronometer'),
    largeIcon: assertOptionalImageSource(props.largeIcon, 'largeIcon'),
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
    title: assertOptionalNonEmptyString(props.title, 'title'),
    subText: assertOptionalString(props.subText, 'subText'),
    text,
    bigText: assertOptionalString(props.bigText, 'bigText') ?? text,
    shortCriticalText: assertOptionalString(props.shortCriticalText, 'shortCriticalText'),
    when: normalizeWhen(props.when),
    chronometer: assertBoolean(props.chronometer, 'chronometer'),
    largeIcon: assertOptionalImageSource(props.largeIcon, 'largeIcon'),
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

  throw new Error(
    '[Voltra] [Android] Ongoing notification content must use AndroidOngoingNotification.Progress or AndroidOngoingNotification.BigText.'
  )
}

export const renderAndroidOngoingNotificationPayload = (content: ReactNode): string => {
  return JSON.stringify(renderAndroidOngoingNotificationPayloadToJson(content))
}

export const renderAndroidOngoingNotificationContent = (content: AndroidOngoingNotificationContent): string => {
  return renderAndroidOngoingNotificationPayload(content)
}
