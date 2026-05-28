import { discoverAndroidProject } from '../../discovery/android'
import { VoltraCliError } from '../../reporting/summary'

import { ensureAndroidManifest } from './manifest'
import { generateAndroidFiles } from './generated'

import type { NormalizedVoltraConfig } from '../../config/types'
import type { AndroidProjectDiscovery } from '../../discovery/android'
import type { PlatformApplyContext, PlatformApplyResult } from '../../apply'
import type { ApplyPreflightContext, PlatformPreflightResult, PlatformPreflightRunner } from '../../apply/preflight'

export function createAndroidPreflightRunner(config: NormalizedVoltraConfig): PlatformPreflightRunner<AndroidProjectDiscovery> {
  return async (_context: ApplyPreflightContext): Promise<PlatformPreflightResult<AndroidProjectDiscovery>> => {
    const androidConfig = config.android

    if (!androidConfig) {
      return {
        platform: 'android',
        issues: [{ message: 'Android config is missing.' }],
      }
    }

    return {
      platform: 'android',
      context: await discoverAndroidProject(config.projectRoot, androidConfig.project),
    }
  }
}

export async function applyAndroidPlatform(context: PlatformApplyContext): Promise<PlatformApplyResult> {
  if (context.platform !== 'android') {
    throw new VoltraCliError(`Android apply runner received unexpected platform: ${context.platform}.`)
  }

  const androidConfig = context.config.android

  if (!androidConfig) {
    throw new VoltraCliError('Android config is missing.')
  }

  const discovery = getAndroidDiscovery(context.preflight)
  const generatedResult = await generateAndroidFiles({
    projectRoot: context.config.projectRoot,
    android: androidConfig,
    discovery,
  })
  const manifestResult = await ensureAndroidManifest({
    projectRoot: context.config.projectRoot,
    android: androidConfig,
    discovery,
  })

  return {
    platform: 'android',
    changes: manifestResult.change ? [manifestResult.change, ...generatedResult.changes] : generatedResult.changes,
    generatedFiles: generatedResult.files,
    warnings: generatedResult.warnings,
  }
}

function getAndroidDiscovery(value: unknown): AndroidProjectDiscovery {
  if (!isAndroidProjectDiscovery(value)) {
    throw new VoltraCliError('Android preflight did not provide a valid discovery result.')
  }

  return value
}

function isAndroidProjectDiscovery(value: unknown): value is AndroidProjectDiscovery {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<AndroidProjectDiscovery>

  return [
    candidate.androidRoot,
    candidate.appModuleName,
    candidate.appModuleRoot,
    candidate.manifestPath,
    candidate.buildGradlePath,
    candidate.packageName,
  ].every((entry) => typeof entry === 'string' && entry.length > 0)
}
