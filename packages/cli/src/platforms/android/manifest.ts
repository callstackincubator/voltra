import { Builder, parseStringPromise } from 'xml2js'

import { readTextFile, writeTextFile } from '../../fs/readWrite'
import { toRelativePath } from '../../fs/path'
import { VoltraCliError } from '../../reporting/summary'

import type { NormalizedVoltraAndroidConfig } from '../../config/types'
import type { AndroidProjectDiscovery } from '../../discovery/android'
import type { ReportedChange } from '../../reporting/summary'

const XML_BUILDER = new Builder({
  headless: false,
  renderOpts: {
    pretty: true,
    indent: '  ',
    newline: '\n',
  },
})

const APPWIDGET_UPDATE_ACTION = 'android.appwidget.action.APPWIDGET_UPDATE'
const APPWIDGET_PROVIDER_METADATA = 'android.appwidget.provider'
const ONGOING_NOTIFICATION_RECEIVER = 'voltra.VoltraOngoingNotificationDismissedReceiver'
const POST_NOTIFICATIONS_PERMISSION = 'android.permission.POST_NOTIFICATIONS'
const POST_PROMOTED_NOTIFICATIONS_PERMISSION = 'android.permission.POST_PROMOTED_NOTIFICATIONS'
const WIDGET_RECEIVER_NAME_PREFIX = '.widget.VoltraWidget_'
const WIDGET_RECEIVER_NAME_SUFFIX = 'Receiver'
const WIDGET_INFO_RESOURCE_PREFIX = '@xml/voltra_widget_'
const WIDGET_INFO_RESOURCE_SUFFIX = '_info'

export interface EnsureAndroidManifestOptions {
  projectRoot: string
  android: NormalizedVoltraAndroidConfig
  discovery: AndroidProjectDiscovery
}

export interface EnsureAndroidManifestResult {
  change?: ReportedChange
}

interface AndroidManifestDocument {
  manifest?: AndroidManifestRoot
}

interface AndroidManifestRoot {
  $?: Record<string, string>
  application?: AndroidManifestApplication[]
  'uses-permission'?: AndroidManifestPermission[]
}

interface AndroidManifestPermission {
  $?: Record<string, string>
}

interface AndroidManifestApplication {
  $?: Record<string, string>
  receiver?: AndroidManifestReceiver[]
}

interface AndroidManifestReceiver {
  $?: Record<string, string>
  'intent-filter'?: AndroidManifestIntentFilter[]
  'meta-data'?: AndroidManifestMetaData[]
}

interface AndroidManifestIntentFilter {
  action?: AndroidManifestAction[]
}

interface AndroidManifestAction {
  $?: Record<string, string>
}

interface AndroidManifestMetaData {
  $?: Record<string, string>
}

export class AndroidManifestMutationError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_ANDROID_MANIFEST_MUTATION_FAILED')
    this.name = 'AndroidManifestMutationError'
  }
}

export async function ensureAndroidManifest(
  options: EnsureAndroidManifestOptions
): Promise<EnsureAndroidManifestResult> {
  const { projectRoot, android, discovery } = options
  const manifestPath = discovery.manifestPath
  const previousContent = await readTextFile(manifestPath)
  const manifestDocument = await parseAndroidManifest(previousContent, manifestPath)
  const manifest = manifestDocument.manifest

  if (!manifest) {
    throw new AndroidManifestMutationError(`Android manifest root is missing in ${manifestPath}`)
  }

  const application = getMainApplication(manifest, manifestPath)
  const permissions = manifest['uses-permission'] ?? []
  manifest['uses-permission'] = permissions

  reconcileNotificationPermissions(permissions, android.enableNotifications)

  const receivers = application.receiver ?? []
  application.receiver = receivers

  reconcileNotificationReceiver(receivers, android.enableNotifications)
  removeStaleWidgetReceivers(
    receivers,
    android.widgets.map((widget) => widget.id)
  )

  if (android.enableNotifications) {
    ensureNotificationReceiver(receivers)
  }

  for (const widget of android.widgets) {
    ensureWidgetReceiver(receivers, widget.id)
  }

  const nextContent = `${XML_BUILDER.buildObject(manifestDocument)}\n`

  if (nextContent === previousContent) {
    return {}
  }

  await writeTextFile(manifestPath, nextContent)

  return {
    change: {
      kind: 'updated',
      path: toRelativePath(projectRoot, manifestPath),
    },
  }
}

async function parseAndroidManifest(content: string, manifestPath: string): Promise<AndroidManifestDocument> {
  try {
    return (await parseStringPromise(content)) as AndroidManifestDocument
  } catch (error: unknown) {
    throw new AndroidManifestMutationError(
      `Failed to parse AndroidManifest.xml at ${manifestPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

function getMainApplication(manifest: AndroidManifestRoot, manifestPath: string): AndroidManifestApplication {
  const applications = manifest.application ?? []

  if (applications.length === 0) {
    throw new AndroidManifestMutationError(
      `Android manifest does not contain an <application> element: ${manifestPath}`
    )
  }

  if (applications.length > 1) {
    throw new AndroidManifestMutationError(`Android manifest contains multiple <application> elements: ${manifestPath}`)
  }

  return applications[0]
}

function ensurePermission(permissions: AndroidManifestPermission[], permissionName: string): void {
  const matchingPermissions = permissions.filter((permission) => permission.$?.['android:name'] === permissionName)

  if (matchingPermissions.length === 0) {
    permissions.push(createPermission(permissionName))
    return
  }

  const primaryPermission = matchingPermissions[0]
  primaryPermission.$ = {
    ...primaryPermission.$,
    'android:name': permissionName,
  }

  removeDuplicateEntries(permissions, (permission) => permission.$?.['android:name'] === permissionName)
}

function reconcileNotificationPermissions(permissions: AndroidManifestPermission[], enabled: boolean): void {
  if (enabled) {
    ensurePermission(permissions, POST_NOTIFICATIONS_PERMISSION)
    ensurePermission(permissions, POST_PROMOTED_NOTIFICATIONS_PERMISSION)
  }
}

function ensureNotificationReceiver(receivers: AndroidManifestReceiver[]): void {
  const receiver = findReceiverByName(receivers, ONGOING_NOTIFICATION_RECEIVER)

  if (receiver) {
    receiver.$ = {
      ...receiver.$,
      'android:name': ONGOING_NOTIFICATION_RECEIVER,
      'android:exported': 'false',
    }
    removeDuplicateEntries(receivers, (candidate) => candidate.$?.['android:name'] === ONGOING_NOTIFICATION_RECEIVER)
    return
  }

  receivers.push(createReceiver(ONGOING_NOTIFICATION_RECEIVER, 'false'))
}

function reconcileNotificationReceiver(receivers: AndroidManifestReceiver[], enabled: boolean): void {
  if (enabled) {
    ensureNotificationReceiver(receivers)
    return
  }

  removeEntries(receivers, (receiver) => receiver.$?.['android:name'] === ONGOING_NOTIFICATION_RECEIVER)
}

function ensureWidgetReceiver(receivers: AndroidManifestReceiver[], widgetId: string): void {
  const receiverName = `.widget.VoltraWidget_${widgetId}Receiver`
  const metadataResource = `@xml/voltra_widget_${widgetId}_info`
  const labelResource = `@string/voltra_widget_${widgetId}_label`
  const receiver = findReceiverByName(receivers, receiverName)

  if (receiver) {
    receiver.$ = {
      ...receiver.$,
      'android:name': receiverName,
      'android:exported': 'true',
      'android:label': labelResource,
    }
    ensureAppWidgetUpdateIntentFilter(receiver)
    ensureReceiverMetadata(receiver, metadataResource)
    removeDuplicateEntries(receivers, (candidate) => candidate.$?.['android:name'] === receiverName)
    return
  }

  const nextReceiver = createReceiver(receiverName, 'true', labelResource)
  ensureAppWidgetUpdateIntentFilter(nextReceiver)
  ensureReceiverMetadata(nextReceiver, metadataResource)
  receivers.push(nextReceiver)
}

function removeStaleWidgetReceivers(receivers: AndroidManifestReceiver[], widgetIds: string[]): void {
  const nextWidgetIds = new Set(widgetIds)

  removeEntries(receivers, (receiver) => {
    const receiverName = receiver.$?.['android:name']

    if (
      !receiverName ||
      !receiverName.startsWith(WIDGET_RECEIVER_NAME_PREFIX) ||
      !receiverName.endsWith(WIDGET_RECEIVER_NAME_SUFFIX)
    ) {
      return false
    }

    const widgetId = receiverName.slice(WIDGET_RECEIVER_NAME_PREFIX.length, -WIDGET_RECEIVER_NAME_SUFFIX.length)

    if (!widgetId || nextWidgetIds.has(widgetId)) {
      return false
    }

    const metadataResource = getReceiverMetadataResource(receiver)
    return metadataResource === undefined || isWidgetMetadataResource(metadataResource)
  })
}

function ensureAppWidgetUpdateIntentFilter(receiver: AndroidManifestReceiver): void {
  const intentFilters = receiver['intent-filter'] ?? []
  receiver['intent-filter'] = intentFilters

  const existingFilter = intentFilters.find((intentFilter) =>
    (intentFilter.action ?? []).some((action) => action.$?.['android:name'] === APPWIDGET_UPDATE_ACTION)
  )

  if (existingFilter) {
    existingFilter.action = [{ $: { 'android:name': APPWIDGET_UPDATE_ACTION } }]
    removeDuplicateEntries(intentFilters, (intentFilter) =>
      (intentFilter.action ?? []).some((action) => action.$?.['android:name'] === APPWIDGET_UPDATE_ACTION)
    )
    return
  }

  intentFilters.push({
    action: [
      {
        $: {
          'android:name': APPWIDGET_UPDATE_ACTION,
        },
      },
    ],
  })
}

function ensureReceiverMetadata(receiver: AndroidManifestReceiver, metadataResource: string): void {
  const metadataEntries = receiver['meta-data'] ?? []
  receiver['meta-data'] = metadataEntries

  const providerMetadata = metadataEntries.find(
    (metadata) => metadata.$?.['android:name'] === APPWIDGET_PROVIDER_METADATA
  )

  if (providerMetadata) {
    providerMetadata.$ = {
      ...providerMetadata.$,
      'android:name': APPWIDGET_PROVIDER_METADATA,
      'android:resource': metadataResource,
    }
    removeDuplicateEntries(metadataEntries, (metadata) => metadata.$?.['android:name'] === APPWIDGET_PROVIDER_METADATA)
    return
  }

  metadataEntries.push({
    $: {
      'android:name': APPWIDGET_PROVIDER_METADATA,
      'android:resource': metadataResource,
    },
  })
}

function findReceiverByName(
  receivers: AndroidManifestReceiver[],
  receiverName: string
): AndroidManifestReceiver | undefined {
  return receivers.find((receiver) => receiver.$?.['android:name'] === receiverName)
}

function getReceiverMetadataResource(receiver: AndroidManifestReceiver): string | undefined {
  return receiver['meta-data']?.find((metadata) => metadata.$?.['android:name'] === APPWIDGET_PROVIDER_METADATA)?.$?.[
    'android:resource'
  ]
}

function isWidgetMetadataResource(resource: string): boolean {
  return resource.startsWith(WIDGET_INFO_RESOURCE_PREFIX) && resource.endsWith(WIDGET_INFO_RESOURCE_SUFFIX)
}

function createPermission(permissionName: string): AndroidManifestPermission {
  return {
    $: {
      'android:name': permissionName,
    },
  }
}

function createReceiver(receiverName: string, exported: 'true' | 'false', label?: string): AndroidManifestReceiver {
  return {
    $: {
      'android:name': receiverName,
      'android:exported': exported,
      ...(label ? { 'android:label': label } : {}),
    },
  }
}

function removeDuplicateEntries<TEntry>(entries: TEntry[], isDuplicate: (entry: TEntry) => boolean): void {
  let foundPrimary = false

  for (let index = 0; index < entries.length; ) {
    if (!isDuplicate(entries[index])) {
      index += 1
      continue
    }

    if (!foundPrimary) {
      foundPrimary = true
      index += 1
      continue
    }

    entries.splice(index, 1)
  }
}

function removeEntries<TEntry>(entries: TEntry[], shouldRemove: (entry: TEntry) => boolean): void {
  for (let index = 0; index < entries.length; ) {
    if (!shouldRemove(entries[index])) {
      index += 1
      continue
    }

    entries.splice(index, 1)
  }
}
