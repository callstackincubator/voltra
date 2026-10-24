/**
 * Manifest rules for `ongoingNotificationForegroundService`, shared by the Android Expo plugin and
 * the `voltra` CLI. It declares the foreground service that keeps an ongoing notification's app alive.
 *
 * The helpers report problems instead of throwing so each caller can raise its own error type, and
 * they edit manifest objects in the xml2js shape both callers parse.
 *
 * The `voltra` CLI holds the other copy of this module in `packages/cli/src/config/foregroundService.ts`;
 * keep the two in sync.
 */

export const ONGOING_NOTIFICATION_SERVICE_CLASS = 'voltra.ongoingnotification.VoltraOngoingNotificationService'
export const SPECIAL_USE_FGS_SUBTYPE_PROPERTY = 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE'
export const FOREGROUND_SERVICE_PERMISSION = 'android.permission.FOREGROUND_SERVICE'

export const ONGOING_NOTIFICATION_FOREGROUND_SERVICE_TYPES = [
  'location',
  'health',
  'mediaPlayback',
  'remoteMessaging',
  'connectedDevice',
  'dataSync',
  'shortService',
  'specialUse',
] as const

export type OngoingNotificationForegroundServiceType = (typeof ONGOING_NOTIFICATION_FOREGROUND_SERVICE_TYPES)[number]

// shortService needs no type permission, only the base FOREGROUND_SERVICE one.
export const FOREGROUND_SERVICE_TYPE_PERMISSIONS: Record<OngoingNotificationForegroundServiceType, string | null> = {
  location: 'android.permission.FOREGROUND_SERVICE_LOCATION',
  health: 'android.permission.FOREGROUND_SERVICE_HEALTH',
  mediaPlayback: 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  remoteMessaging: 'android.permission.FOREGROUND_SERVICE_REMOTE_MESSAGING',
  connectedDevice: 'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
  dataSync: 'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
  shortService: null,
  specialUse: 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
}

export interface OngoingNotificationForegroundServiceManifestConfig {
  types: readonly string[]
  specialUseSubtype?: string
}

interface ManifestElement {
  $?: Record<string, string>
}

interface ManifestService extends ManifestElement {
  property?: ManifestElement[]
}

export interface ForegroundServiceManifestRoot {
  'uses-permission'?: ManifestElement[]
}

export interface ForegroundServiceManifestApplication {
  service?: ManifestService[]
}

export function isOngoingNotificationForegroundServiceType(
  value: unknown
): value is OngoingNotificationForegroundServiceType {
  return (ONGOING_NOTIFICATION_FOREGROUND_SERVICE_TYPES as readonly unknown[]).includes(value)
}

export function foregroundServiceTypePermission(type: string): string | null {
  return isOngoingNotificationForegroundServiceType(type) ? FOREGROUND_SERVICE_TYPE_PERMISSIONS[type] : null
}

export function foregroundServiceTypeAttribute(types: readonly string[]): string {
  return types.join('|')
}

export function parseForegroundServiceTypeAttribute(attribute: string | undefined): string[] {
  return (attribute ?? '')
    .split('|')
    .map((type) => type.trim())
    .filter((type) => type.length > 0)
}

/**
 * Returns the permissions the service needs, in manifest order: the base one first, then one per type.
 */
export function foregroundServicePermissions(types: readonly string[]): string[] {
  const permissions = [FOREGROUND_SERVICE_PERMISSION]

  for (const type of types) {
    const permission = foregroundServiceTypePermission(type)
    if (permission && !permissions.includes(permission)) {
      permissions.push(permission)
    }
  }

  return permissions
}

/**
 * Returns an error message for an invalid `ongoingNotificationForegroundService` value, or undefined.
 * `context` is the key path the caller reports, for example `android.ongoingNotificationForegroundService`.
 */
export function ongoingNotificationForegroundServiceError(value: unknown, context: string): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return `${context} must be an object`
  }

  const { types, specialUseSubtype } = value as Record<string, unknown>

  if (!Array.isArray(types) || types.length === 0) {
    return `${context}.types must be a non-empty array`
  }

  const seen = new Set<string>()
  for (const type of types) {
    if (!isOngoingNotificationForegroundServiceType(type)) {
      return `${context}.types contains unsupported type '${String(
        type
      )}'. Supported types: ${ONGOING_NOTIFICATION_FOREGROUND_SERVICE_TYPES.join(', ')}`
    }
    if (seen.has(type)) {
      return `${context}.types contains duplicate type '${type}'`
    }
    seen.add(type)
  }

  if (specialUseSubtype !== undefined && (typeof specialUseSubtype !== 'string' || !specialUseSubtype.trim())) {
    return `${context}.specialUseSubtype must be a non-empty string`
  }

  if (seen.has('specialUse') && specialUseSubtype === undefined) {
    return `${context}.specialUseSubtype must be a non-empty string when types includes 'specialUse'`
  }

  return undefined
}

/**
 * Adds, updates or removes Voltra's foreground service. Pass undefined to remove it.
 *
 * Removing the service, or dropping a type, never removes a permission. A library merged in at build
 * time may declare a service that needs the same permission, and that service is not visible here,
 * so a permission Voltra once added is indistinguishable from one the app relies on.
 */
export function reconcileOngoingNotificationForegroundService(
  manifest: ForegroundServiceManifestRoot,
  application: ForegroundServiceManifestApplication,
  config: OngoingNotificationForegroundServiceManifestConfig | undefined
): void {
  const isVoltraService = (service: ManifestService) =>
    service.$?.['android:name'] === ONGOING_NOTIFICATION_SERVICE_CLASS
  const services = application.service ?? []
  const previousServices = services.filter(isVoltraService)

  if (config) {
    const service = previousServices[0] ?? {}
    service.$ = {
      ...service.$,
      'android:name': ONGOING_NOTIFICATION_SERVICE_CLASS,
      'android:exported': 'false',
      'android:foregroundServiceType': foregroundServiceTypeAttribute(config.types),
    }
    reconcileSpecialUseProperty(service, config)

    if (previousServices.length === 0) {
      services.push(service)
    }
    removeEntries(services, (candidate) => candidate !== service && isVoltraService(candidate))
    application.service = services

    const permissions = manifest['uses-permission'] ?? []
    for (const permissionName of foregroundServicePermissions(config.types)) {
      if (!permissions.some((permission) => permission.$?.['android:name'] === permissionName)) {
        permissions.push({ $: { 'android:name': permissionName } })
      }
    }
    manifest['uses-permission'] = permissions
  } else {
    removeEntries(services, isVoltraService)
  }
}

function reconcileSpecialUseProperty(
  service: ManifestService,
  config: OngoingNotificationForegroundServiceManifestConfig
): void {
  const properties = (service.property ?? []).filter(
    (property) => property.$?.['android:name'] !== SPECIAL_USE_FGS_SUBTYPE_PROPERTY
  )

  if (config.types.includes('specialUse') && config.specialUseSubtype) {
    properties.push({
      $: {
        'android:name': SPECIAL_USE_FGS_SUBTYPE_PROPERTY,
        'android:value': config.specialUseSubtype,
      },
    })
  }

  if (properties.length > 0) {
    service.property = properties
  } else {
    delete service.property
  }
}

function removeEntries<TEntry>(entries: TEntry[], shouldRemove: (entry: TEntry) => boolean): void {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (shouldRemove(entries[index])) {
      entries.splice(index, 1)
    }
  }
}
