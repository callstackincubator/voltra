import { discoverAndroidProject } from '../../discovery/android'
import { getMissingPlatformPackageMessage, getMissingPlatformPackages } from '../../dependencies/platformPackages'
import { VoltraCliError } from '../../reporting/summary'

import { ensureAndroidManifest } from './manifest'
import { ensureAndroidGradleWidgetBundling } from './gradle'
import { generateAndroidFiles } from './generated'

import type { NormalizedVoltraConfig } from '../../config/types'
import type { AndroidProjectDiscovery } from '../../discovery/android'
import type { PlatformApplyContext, PlatformApplyResult } from '../../apply'
import type { ApplyPreflightContext, PlatformPreflightResult, PlatformPreflightRunner } from '../../apply/preflight'

export function createAndroidPreflightRunner(
  config: NormalizedVoltraConfig
): PlatformPreflightRunner<AndroidProjectDiscovery> {
  return async (_context: ApplyPreflightContext): Promise<PlatformPreflightResult<AndroidProjectDiscovery>> => {
    const androidConfig = config.android

    if (!androidConfig) {
      return {
        platform: 'android',
        issues: [{ message: 'Android config is missing.' }],
      }
    }

    const missingPackages = getMissingPlatformPackages(config.projectRoot, 'android')

    if (missingPackages.length > 0) {
      return {
        platform: 'android',
        issues: [{ message: getMissingPlatformPackageMessage('android', missingPackages) }],
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
  const gradleResult = await ensureAndroidGradleWidgetBundling({
    projectRoot: context.config.projectRoot,
    discovery,
    hasDynamicWidgets: androidConfig.widgets.some((widget) => widget.entry !== undefined),
  })

  return {
    platform: 'android',
    changes: [manifestResult.change, gradleResult.change, ...generatedResult.changes].filter(isDefined),
    generatedFiles: generatedResult.files,
    warnings: [...generatedResult.warnings, ...(gradleResult.warnings ?? [])],
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

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined
}
