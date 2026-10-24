import { renderAndroidOngoingNotificationPayloadToJson } from './renderer.js'
import type {
  AndroidOngoingNotificationContent,
  AndroidOngoingNotificationPayload,
  UpsertAndroidOngoingNotificationOptions,
} from './types.js'

/** Options a push may carry. `notificationId` and `revision` live on the envelope itself. */
export type AndroidOngoingNotificationPushOptions = Omit<
  Partial<UpsertAndroidOngoingNotificationOptions>,
  'notificationId' | 'revision'
>

/** Version 1 of the message sent as `data.voltraOngoingNotification`, as an object or a JSON string. */
export type AndroidOngoingNotificationPushEnvelope = {
  v: 1
  notificationId: string
  operation: 'upsert' | 'stop'
  revision?: number
  options?: AndroidOngoingNotificationPushOptions
  payload?: AndroidOngoingNotificationPayload
}

export type AndroidOngoingNotificationPushParseFailure = 'no_envelope' | 'invalid_envelope' | 'unsupported_version'

export type AndroidOngoingNotificationPushParseResult =
  | { ok: true; envelope: AndroidOngoingNotificationPushEnvelope }
  | { ok: false; reason: AndroidOngoingNotificationPushParseFailure; issues: string[] }

const ENVELOPE_KEY = 'voltraOngoingNotification'

// How many wrapper levels (`data`, `body`, `dataString`) are searched for the envelope.
const MAX_WRAPPER_DEPTH = 3

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A record as-is, a JSON string that decodes to a record, or undefined. */
const toRecord = (value: unknown): UnknownRecord | undefined => {
  if (isRecord(value)) return value
  if (typeof value !== 'string') return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

/** Finds the raw envelope in the shapes push providers and `expo-notifications` hand to a task. */
const findRawEnvelope = (data: unknown): { found: true; value: unknown } | { found: false } => {
  let candidates: unknown[] = [data]
  for (let depth = 0; depth <= MAX_WRAPPER_DEPTH && candidates.length > 0; depth += 1) {
    const next: unknown[] = []
    for (const candidate of candidates) {
      const record = toRecord(candidate)
      if (!record) continue
      if (ENVELOPE_KEY in record && record[ENVELOPE_KEY] !== undefined && record[ENVELOPE_KEY] !== null) {
        return { found: true, value: record[ENVELOPE_KEY] }
      }
      next.push(record.data, record.body, record.dataString)
    }
    candidates = next
  }
  return { found: false }
}

/**
 * Reads a Voltra ongoing notification push from the `data` a background task receives. Pure: it never
 * touches the native module, so it also runs on a server or in tests.
 *
 * Accepts `data.voltraOngoingNotification` as an object or JSON string, also when it is nested under
 * `data`, or inside `body` or `dataString` JSON strings.
 */
export const parseAndroidOngoingNotificationPush = (data: unknown): AndroidOngoingNotificationPushParseResult => {
  const raw = findRawEnvelope(data)
  if (!raw.found) {
    return { ok: false, reason: 'no_envelope', issues: [] }
  }

  const message = toRecord(raw.value)
  if (!message) {
    return {
      ok: false,
      reason: 'invalid_envelope',
      issues: [`${ENVELOPE_KEY} must be an object or a JSON object string`],
    }
  }

  if (message.v !== undefined && message.v !== 1) {
    if (typeof message.v === 'number') {
      return { ok: false, reason: 'unsupported_version', issues: [`v ${message.v} is not supported; expected 1`] }
    }
    return { ok: false, reason: 'invalid_envelope', issues: ['v must be the number 1'] }
  }

  const issues: string[] = []
  const { notificationId, operation, revision } = message

  if (typeof notificationId !== 'string' || notificationId.length === 0) {
    issues.push('notificationId must be a non-empty string')
  }
  if (operation !== 'upsert' && operation !== 'stop') {
    issues.push("operation must be 'upsert' or 'stop'")
  }
  if (revision !== undefined && !isNonNegativeInteger(revision)) {
    issues.push('revision must be a non-negative integer')
  }

  const options = message.options === undefined || message.options === null ? undefined : toRecord(message.options)
  if (message.options !== undefined && message.options !== null && !options) {
    issues.push('options must be an object or a JSON object string')
  }

  const payload = message.payload === undefined || message.payload === null ? undefined : toRecord(message.payload)
  if (operation === 'upsert' && !payload) {
    issues.push('payload must be an object (or a JSON object string) for upsert')
  }

  if (issues.length > 0) {
    return { ok: false, reason: 'invalid_envelope', issues }
  }

  const envelope: AndroidOngoingNotificationPushEnvelope = {
    v: 1,
    notificationId: notificationId as string,
    operation: operation as 'upsert' | 'stop',
  }
  if (revision !== undefined) envelope.revision = revision as number
  if (options) envelope.options = options as AndroidOngoingNotificationPushOptions
  if (operation === 'upsert') envelope.payload = payload as AndroidOngoingNotificationPayload

  return { ok: true, envelope }
}

export type CreateAndroidOngoingNotificationPushEnvelopeInput = {
  notificationId: string
  operation: 'upsert' | 'stop'
  revision?: number
  options?: AndroidOngoingNotificationPushOptions
  /** Required for upsert: JSX content, or a payload already rendered. Ignored for stop. */
  content?: AndroidOngoingNotificationContent | AndroidOngoingNotificationPayload
}

const isAndroidOngoingNotificationPayload = (value: unknown): value is AndroidOngoingNotificationPayload =>
  isRecord(value) && 'v' in value && 'kind' in value

/**
 * Builds the `voltraOngoingNotification` message for a push. Use `string` where the provider only
 * takes string values (FCM `data`), and `object` where it takes JSON.
 */
export const createAndroidOngoingNotificationPushEnvelope = (
  input: CreateAndroidOngoingNotificationPushEnvelopeInput
): { object: AndroidOngoingNotificationPushEnvelope; string: string } => {
  if (typeof input.notificationId !== 'string' || input.notificationId.length === 0) {
    throw new Error('[Voltra] [Android] Push envelope notificationId must be a non-empty string.')
  }
  if (input.operation !== 'upsert' && input.operation !== 'stop') {
    throw new Error("[Voltra] [Android] Push envelope operation must be 'upsert' or 'stop'.")
  }
  if (input.revision !== undefined && !isNonNegativeInteger(input.revision)) {
    throw new Error('[Voltra] [Android] Push envelope revision must be a non-negative integer.')
  }

  const object: AndroidOngoingNotificationPushEnvelope = {
    v: 1,
    notificationId: input.notificationId,
    operation: input.operation,
  }
  if (input.revision !== undefined) object.revision = input.revision
  if (input.options !== undefined) object.options = input.options

  if (input.operation === 'upsert') {
    if (input.content === undefined || input.content === null) {
      throw new Error('[Voltra] [Android] Push envelope content is required for upsert.')
    }
    object.payload = isAndroidOngoingNotificationPayload(input.content)
      ? input.content
      : renderAndroidOngoingNotificationPayloadToJson(input.content)
  }

  return { object, string: JSON.stringify(object) }
}
