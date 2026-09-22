import {
  ANDROID_ONGOING_NOTIFICATION_CATEGORIES,
  ANDROID_ONGOING_NOTIFICATION_VISIBILITIES,
  type AndroidOngoingNotificationPresentationOptions,
  type StartAndroidOngoingNotificationOptions,
  type UpdateAndroidOngoingNotificationOptions,
  type UpsertAndroidOngoingNotificationOptions,
} from '@use-voltra/android'

type PresentationOptionName = keyof AndroidOngoingNotificationPresentationOptions

/** Any of the presentation options as they arrive from the caller: optional, and maybe `null`. */
type PresentationOptionsBag = Partial<Record<PresentationOptionName, unknown>>

type OptionsValidator = (value: unknown, optionName: string) => void

const invalidOption = (optionName: string, expectation: string): never => {
  throw new Error(`[Voltra] [Android] Ongoing notification option "${optionName}" ${expectation}.`)
}

const checkOneOf =
  (allowed: readonly string[]): OptionsValidator =>
  (value, optionName) => {
    if (typeof value !== 'string' || !allowed.includes(value)) {
      invalidOption(optionName, `must be one of ${allowed.map((name) => `"${name}"`).join(', ')}`)
    }
  }

const checkNonEmptyString: OptionsValidator = (value, optionName) => {
  if (typeof value !== 'string' || value.length === 0) {
    invalidOption(optionName, 'must be a non-empty string')
  }
}

const checkBoolean: OptionsValidator = (value, optionName) => {
  if (typeof value !== 'boolean') {
    invalidOption(optionName, 'must be a boolean')
  }
}

const checkPositiveInteger: OptionsValidator = (value, optionName) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    invalidOption(optionName, 'must be a positive integer number of milliseconds')
  }
}

/**
 * One validator per presentation option.
 *
 * Being keyed by every key of the options type is the point: a new presentation option cannot be
 * added to the public type without saying how to validate it. An option that reaches the native side
 * unvalidated is an option whose bad values get discovered on a device.
 */
const presentationOptionValidators: Record<PresentationOptionName, OptionsValidator> = {
  visibility: checkOneOf(ANDROID_ONGOING_NOTIFICATION_VISIBILITIES),
  category: checkOneOf(ANDROID_ONGOING_NOTIFICATION_CATEGORIES),
  color: checkNonEmptyString,
  timeoutMs: checkPositiveInteger,
  localOnly: checkBoolean,
  group: checkNonEmptyString,
  sortKey: checkNonEmptyString,
  allowSystemGeneratedContextualActions: checkBoolean,
}

const presentationOptionNames = Object.keys(presentationOptionValidators) as PresentationOptionName[]

/**
 * Checks every presentation option the caller sent.
 *
 * `allowNull` is false when starting, where a `null` is just not a value, and true when updating,
 * where it means "clear the stored value" and is forwarded untouched.
 */
const validatePresentationOptions = (options: PresentationOptionsBag, allowNull: boolean): void => {
  presentationOptionNames.forEach((optionName) => {
    const value = options[optionName]

    if (value === undefined || (allowNull && value === null)) {
      return
    }

    presentationOptionValidators[optionName](value, optionName)
  })
}

/**
 * The presentation options to forward, dropping only the keys the caller left out. Keeping an
 * explicit `null` is what lets the native side tell "clear this" from "keep what is stored".
 */
const getPresentationOptionsToForward = (options: PresentationOptionsBag): Record<string, unknown> => {
  const forwardedOptions: Record<string, unknown> = {}

  presentationOptionNames.forEach((optionName) => {
    const value = options[optionName]

    if (value !== undefined) {
      forwardedOptions[optionName] = value
    }
  })

  return forwardedOptions
}

/**
 * Validates start options and builds the object that crosses the bridge.
 *
 * Everything that decides what the native module sees lives here, so no caller can reach
 * `NativeVoltraAndroid` with an option this release does not understand.
 *
 * @throws synchronously, before any native call, when an option is malformed.
 */
export const getStartAndroidOngoingNotificationOptions = (
  options: StartAndroidOngoingNotificationOptions
): StartAndroidOngoingNotificationOptions => {
  const { alert } = options as StartAndroidOngoingNotificationOptions & { alert?: unknown }

  if (alert !== undefined) {
    invalidOption('alert', 'is only available when updating a notification, and a first post always alerts')
  }

  validatePresentationOptions(options, false)

  return {
    notificationId: options.notificationId,
    channelId: options.channelId,
    smallIcon: options.smallIcon,
    deepLinkUrl: options.deepLinkUrl,
    requestPromotedOngoing: options.requestPromotedOngoing,
    fallbackBehavior: options.fallbackBehavior,
    ...getPresentationOptionsToForward(options),
  }
}

/**
 * Validates upsert options and builds the object that crosses the bridge.
 *
 * An upsert may update, so it accepts what an update accepts: a `null` presentation option, which
 * clears the stored value when there is one to clear, and `alert`, which the update branch honours.
 * On the start branch neither changes anything, because nothing is stored yet and a first post
 * always alerts.
 *
 * @throws synchronously, before any native call, when an option is malformed.
 */
export const getUpsertAndroidOngoingNotificationOptions = (
  options: UpsertAndroidOngoingNotificationOptions
): UpsertAndroidOngoingNotificationOptions => {
  if (options.alert !== undefined) {
    checkBoolean(options.alert, 'alert')
  }

  validatePresentationOptions(options, true)

  return {
    notificationId: options.notificationId,
    channelId: options.channelId,
    smallIcon: options.smallIcon,
    deepLinkUrl: options.deepLinkUrl,
    requestPromotedOngoing: options.requestPromotedOngoing,
    fallbackBehavior: options.fallbackBehavior,
    ...(options.alert === undefined ? {} : { alert: options.alert }),
    ...getPresentationOptionsToForward(options),
  }
}

/**
 * Validates update options and builds the object that crosses the bridge, or `undefined` when the
 * update changes nothing but the payload.
 *
 * A key the caller left out stays out, which is what tells the native side to keep the stored value.
 * A key sent as `null` is forwarded as `null`, which is what tells it to clear the stored value.
 *
 * @throws synchronously, before any native call, when an option is malformed.
 */
export const getFilteredAndroidOngoingNotificationUpdateOptions = (
  options?: UpdateAndroidOngoingNotificationOptions
): UpdateAndroidOngoingNotificationOptions | undefined => {
  if (!options) {
    return undefined
  }

  const filteredOptions: UpdateAndroidOngoingNotificationOptions = {}

  if (options.channelId !== undefined) {
    filteredOptions.channelId = options.channelId
  }

  if (options.smallIcon !== undefined) {
    filteredOptions.smallIcon = options.smallIcon
  }

  if (options.deepLinkUrl !== undefined) {
    filteredOptions.deepLinkUrl = options.deepLinkUrl
  }

  if (options.requestPromotedOngoing !== undefined) {
    filteredOptions.requestPromotedOngoing = options.requestPromotedOngoing
  }

  if (options.fallbackBehavior !== undefined) {
    filteredOptions.fallbackBehavior = options.fallbackBehavior
  }

  if (options.alert !== undefined) {
    checkBoolean(options.alert, 'alert')
    filteredOptions.alert = options.alert
  }

  validatePresentationOptions(options, true)
  Object.assign(filteredOptions, getPresentationOptionsToForward(options))

  return Object.keys(filteredOptions).length > 0 ? filteredOptions : undefined
}
