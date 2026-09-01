import { discoverIOSProject } from '../../discovery/ios'
import { getMissingPlatformPackageMessage, getMissingPlatformPackages } from '../../dependencies/platformPackages'
import { VoltraCliError } from '../../reporting/summary'

import { resolveIOSBuildConfigurationValues } from './buildConfigurationValues'
import { ensureEntitlements } from './entitlements'
import { generateIOSFiles } from './generated'
import { ensureInfoPlist } from './plist'
import { ensurePodfileBlock } from './podfile'
import { ensureIOSWidgetTarget } from './xcodeTarget'

import type { NormalizedVoltraConfig } from '../../config/types'
import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { PlatformApplyContext, PlatformApplyResult } from '../../apply'
import type { ApplyPreflightContext, PlatformPreflightResult, PlatformPreflightRunner } from '../../apply/preflight'

export function createIOSPreflightRunner(config: NormalizedVoltraConfig): PlatformPreflightRunner<IOSProjectDiscovery> {
  return async (_context: ApplyPreflightContext): Promise<PlatformPreflightResult<IOSProjectDiscovery>> => {
    const iosConfig = config.ios

    if (!iosConfig) {
      return {
        platform: 'ios',
        issues: [{ message: 'iOS config is missing.' }],
      }
    }

    const missingPackages = getMissingPlatformPackages(config.projectRoot, 'ios')

    if (missingPackages.length > 0) {
      return {
        platform: 'ios',
        issues: [{ message: getMissingPlatformPackageMessage('ios', missingPackages) }],
      }
    }

    return {
      platform: 'ios',
      context: await discoverIOSProject(config.projectRoot, iosConfig.project),
    }
  }
}

export async function applyIOSPlatform(context: PlatformApplyContext): Promise<PlatformApplyResult> {
  if (context.platform !== 'ios') {
    throw new VoltraCliError(`iOS apply runner received unexpected platform: ${context.platform}.`)
  }

  const iosConfig = context.config.ios

  if (!iosConfig) {
    throw new VoltraCliError('iOS config is missing.')
  }

  const discovery = getIOSDiscovery(context.preflight)
  // Values given per build configuration are collapsed once, so every mutator below sees a plain
  // string and the project carries the per-configuration values.
  const { ios, buildSettings } = resolveIOSBuildConfigurationValues(iosConfig, discovery)
  const generatedResult = await generateIOSFiles({
    projectRoot: context.config.projectRoot,
    ios,
    discovery,
  })
  const entitlementsResult = await ensureEntitlements({
    projectRoot: context.config.projectRoot,
    ios,
    discovery,
  })
  const infoPlistResult = await ensureInfoPlist({
    projectRoot: context.config.projectRoot,
    ios,
    discovery,
  })
  const podfileResult = await ensurePodfileBlock({
    projectRoot: context.config.projectRoot,
    ios,
    discovery,
  })
  const xcodeTargetResult = await ensureIOSWidgetTarget({
    projectRoot: context.config.projectRoot,
    ios,
    discovery,
    generatedFiles: generatedResult.files,
    previousGeneratedFiles: context.previousState?.files,
    buildSettings,
  })

  if (generatedResult.targetName !== xcodeTargetResult.targetName) {
    throw new VoltraCliError(
      `iOS generated files and Xcode target mutation resolved different widget target names: ${generatedResult.targetName} vs ${xcodeTargetResult.targetName}.`
    )
  }

  if (generatedResult.targetName !== podfileResult.targetName) {
    throw new VoltraCliError(
      `iOS generated files and Podfile block resolved different widget target names: ${generatedResult.targetName} vs ${podfileResult.targetName}.`
    )
  }

  const changes = [
    ...infoPlistResult.changes,
    ...entitlementsResult.changes,
    ...[podfileResult.change, xcodeTargetResult.change].filter(isDefined),
  ]

  return {
    platform: 'ios',
    changes: [...changes, ...generatedResult.changes],
    generatedFiles: generatedResult.files,
    warnings: [...(generatedResult.warnings ?? []), ...(podfileResult.warnings ?? [])],
  }
}

function getIOSDiscovery(value: unknown): IOSProjectDiscovery {
  if (!isIOSProjectDiscovery(value)) {
    throw new VoltraCliError('iOS preflight did not provide a valid discovery result.')
  }

  return value
}

function isIOSProjectDiscovery(value: unknown): value is IOSProjectDiscovery {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<IOSProjectDiscovery>

  return (
    [
      candidate.iosRoot,
      candidate.xcodeprojPath,
      candidate.pbxprojPath,
      candidate.podfilePath,
      candidate.mainTargetName,
      candidate.infoPlistPath,
    ].every((entry) => typeof entry === 'string' && entry.length > 0) &&
    [
      candidate.mainTargetCandidates,
      candidate.buildConfigurationNames,
      candidate.infoPlistPaths,
      candidate.entitlementsPaths,
    ].every((entry) => Array.isArray(entry))
  )
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined
}
