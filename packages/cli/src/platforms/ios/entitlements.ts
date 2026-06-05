import { pathExists, readTextFile, writeTextFile } from '../../fs/readWrite'
import { toRelativePath } from '../../fs/path'
import { VoltraCliError } from '../../reporting/summary'

import { buildPlistXml, parsePlistFile } from './plist'
import { resolveMainAppEntitlementsPath } from './mainAppEntitlements'

import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { NormalizedVoltraIOSConfig } from '../../config/types'
import type { ReportedChange } from '../../reporting/summary'

interface PreviousVoltraEntitlementValues {
  appGroupIdentifier?: string
  keychainGroup?: string
  pushNotificationsEnabled: boolean
}

export interface EnsureEntitlementsOptions {
  projectRoot: string
  ios: NormalizedVoltraIOSConfig
  discovery: IOSProjectDiscovery
}

export interface EnsureEntitlementsResult {
  change?: ReportedChange
}

export class IOSEntitlementsMutationError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_IOS_ENTITLEMENTS_FAILED')
    this.name = 'IOSEntitlementsMutationError'
  }
}

export async function ensureEntitlements(options: EnsureEntitlementsOptions): Promise<EnsureEntitlementsResult> {
  const { projectRoot, ios, discovery } = options
  const entitlementsPath = resolveMainAppEntitlementsPath(discovery)

  if (!discovery.entitlementsPath) {
    if (!needsEntitlementsMutation(ios)) {
      return {}
    }
  }

  const entitlements: Record<string, unknown> = (await pathExists(entitlementsPath))
    ? await parsePlistFile(entitlementsPath, 'main app entitlements', createEntitlementsError)
    : {}
  const previousVoltraValues = await readPreviousVoltraEntitlementValues(discovery.infoPlistPath)

  ensureStringArrayValue(
    entitlements,
    'com.apple.security.application-groups',
    ios.groupIdentifier,
    previousVoltraValues.appGroupIdentifier
  )
  ensureStringArrayValue(entitlements, 'keychain-access-groups', ios.keychainGroup, previousVoltraValues.keychainGroup)

  if (ios.enablePushNotifications && entitlements['aps-environment'] === undefined) {
    entitlements['aps-environment'] = 'development'
  } else if (
    !ios.enablePushNotifications &&
    previousVoltraValues.pushNotificationsEnabled &&
    entitlements['aps-environment'] === 'development'
  ) {
    delete entitlements['aps-environment']
  }

  const nextContent = buildPlistXml(entitlements, createEntitlementsError)
  const change = await writeEntitlementsIfChanged(projectRoot, entitlementsPath, nextContent)

  return { change }
}

export function needsEntitlementsMutation(ios: NormalizedVoltraIOSConfig): boolean {
  return ios.enablePushNotifications || ios.groupIdentifier !== undefined || ios.keychainGroup !== undefined
}

function ensureStringArrayValue(
  target: Record<string, unknown>,
  key: string,
  nextValue: string | undefined,
  previousOwnedValue: string | undefined
): void {
  const existingValues = Array.isArray(target[key])
    ? target[key].filter((value): value is string => typeof value === 'string' && value.length > 0)
    : []
  const dedupedValues = Array.from(new Set(existingValues))
  const filteredValues = previousOwnedValue
    ? dedupedValues.filter((value) => value !== previousOwnedValue)
    : dedupedValues

  if (nextValue === undefined) {
    if (filteredValues.length === 0) {
      delete target[key]
      return
    }

    if (filteredValues.length !== existingValues.length) {
      target[key] = filteredValues
    }

    return
  }

  // Preserve unrelated user-managed values in shared entitlements.
  // V1 does not attempt to undo historical shared-file mutations.
  if (!filteredValues.includes(nextValue)) {
    filteredValues.push(nextValue)
  }

  target[key] = filteredValues
}

async function writeEntitlementsIfChanged(
  projectRoot: string,
  entitlementsPath: string,
  nextContent: string
): Promise<ReportedChange | undefined> {
  const previousContent = (await pathExists(entitlementsPath)) ? await readTextFile(entitlementsPath) : undefined

  if (previousContent === nextContent) {
    return undefined
  }

  await writeTextFile(entitlementsPath, nextContent)

  return {
    kind: previousContent === undefined ? 'created' : 'updated',
    path: toRelativePath(projectRoot, entitlementsPath),
  }
}

function createEntitlementsError(message: string): IOSEntitlementsMutationError {
  return new IOSEntitlementsMutationError(message)
}

async function readPreviousVoltraEntitlementValues(infoPlistPath: string): Promise<PreviousVoltraEntitlementValues> {
  const infoPlist = await parsePlistFile(infoPlistPath, 'main app Info.plist', createEntitlementsError)

  return {
    appGroupIdentifier:
      typeof infoPlist.Voltra_AppGroupIdentifier === 'string' ? infoPlist.Voltra_AppGroupIdentifier : undefined,
    keychainGroup: typeof infoPlist.Voltra_KeychainGroup === 'string' ? infoPlist.Voltra_KeychainGroup : undefined,
    pushNotificationsEnabled: infoPlist.Voltra_EnablePushNotifications === true,
  }
}
