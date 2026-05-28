import { readTextFile, writeTextFile } from '../../fs/readWrite'
import { toRelativePath } from '../../fs/path'
import { VoltraCliError } from '../../reporting/summary'

import { buildPlistXml, parsePlistFile } from './plist'

import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { NormalizedVoltraIOSConfig } from '../../config/types'
import type { ReportedChange } from '../../reporting/summary'

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

  if (!discovery.entitlementsPath) {
    if (!needsEntitlementsMutation(ios)) {
      return {}
    }

    throw new IOSEntitlementsMutationError(
      `Could not determine the main app entitlements file. Set ios.project.entitlementsPath to update entitlements for target '${discovery.mainTargetName}'.`
    )
  }

  const entitlements = await parsePlistFile(
    discovery.entitlementsPath,
    'main app entitlements',
    createEntitlementsError
  )

  ensureStringArrayValue(entitlements, 'com.apple.security.application-groups', ios.groupIdentifier)
  ensureStringArrayValue(entitlements, 'keychain-access-groups', ios.keychainGroup)

  if (ios.enablePushNotifications) {
    entitlements['aps-environment'] = 'development'
  }

  const nextContent = buildPlistXml(entitlements, createEntitlementsError)
  const change = await writeEntitlementsIfChanged(projectRoot, discovery.entitlementsPath, nextContent)

  return { change }
}

function needsEntitlementsMutation(ios: NormalizedVoltraIOSConfig): boolean {
  return ios.enablePushNotifications || ios.groupIdentifier !== undefined || ios.keychainGroup !== undefined
}

function ensureStringArrayValue(target: Record<string, unknown>, key: string, nextValue: string | undefined): void {
  const existingValues = Array.isArray(target[key]) ? target[key].filter((value): value is string => typeof value === 'string' && value.length > 0) : []
  const dedupedValues = Array.from(new Set(existingValues))

  if (nextValue === undefined) {
    if (existingValues.length > 0 && dedupedValues.length !== existingValues.length) {
      target[key] = dedupedValues
    }
    return
  }

  // Preserve unrelated user-managed values in shared entitlements.
  // V1 does not attempt to undo historical shared-file mutations.
  if (!dedupedValues.includes(nextValue)) {
    dedupedValues.push(nextValue)
  }

  target[key] = dedupedValues
}

async function writeEntitlementsIfChanged(
  projectRoot: string,
  entitlementsPath: string,
  nextContent: string
): Promise<ReportedChange | undefined> {
  const previousContent = await readTextFile(entitlementsPath)

  if (previousContent === nextContent) {
    return undefined
  }

  await writeTextFile(entitlementsPath, nextContent)

  return {
    kind: 'updated',
    path: toRelativePath(projectRoot, entitlementsPath),
  }
}

function createEntitlementsError(message: string): IOSEntitlementsMutationError {
  return new IOSEntitlementsMutationError(message)
}
