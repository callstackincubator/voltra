import { PreflightError } from '../reporting/summary'

import type { NormalizedVoltraConfig, VoltraPlatform } from '../config/types'
import type { PreflightFailureReport, PreflightIssue } from '../reporting/summary'

export interface PlatformPreflightSuccess<TContext> {
  platform: VoltraPlatform
  context: TContext
}

export interface PlatformPreflightFailure {
  platform: VoltraPlatform
  issues: PreflightIssue[]
}

export type PlatformPreflightResult<TContext> = PlatformPreflightSuccess<TContext> | PlatformPreflightFailure

export interface ApplyPreflightContext {
  requestedPlatforms: VoltraPlatform[]
}

export type PlatformPreflightRunner<TContext> = (
  context: ApplyPreflightContext
) => Promise<PlatformPreflightResult<TContext>>

export interface ApplyPreflightRunners {
  android?: PlatformPreflightRunner<unknown>
  ios?: PlatformPreflightRunner<unknown>
}

export interface ApplyPreflightResult {
  requestedPlatforms: VoltraPlatform[]
  platformResults: Partial<Record<VoltraPlatform, unknown>>
}

export function getRequestedPlatforms(config: NormalizedVoltraConfig, platform?: VoltraPlatform): VoltraPlatform[] {
  if (platform) {
    validateConfiguredPlatform(config, platform)
    return [platform]
  }

  const configuredPlatforms = getConfiguredPlatforms(config)

  if (configuredPlatforms.length === 0) {
    throw new PreflightError({
      summary: 'No platforms are configured for Voltra apply.',
      issues: [{ message: 'Add an android or ios config block before running apply.' }],
    })
  }

  return configuredPlatforms
}

export async function runApplyPreflight(
  config: NormalizedVoltraConfig,
  runners: ApplyPreflightRunners,
  platform?: VoltraPlatform
): Promise<ApplyPreflightResult> {
  const requestedPlatforms = getRequestedPlatforms(config, platform)
  const preflightContext: ApplyPreflightContext = { requestedPlatforms }
  const failures: PlatformPreflightFailure[] = []
  const platformResults: Partial<Record<VoltraPlatform, unknown>> = {}

  await Promise.all(
    requestedPlatforms.map(async (requestedPlatform) => {
      const runner = runners[requestedPlatform]

      if (!runner) {
        failures.push({
          platform: requestedPlatform,
          issues: [{ message: `No preflight runner is registered for ${requestedPlatform}.` }],
        })
        return
      }

      let result: PlatformPreflightResult<unknown>

      try {
        result = await runner(preflightContext)
      } catch (error: unknown) {
        failures.push({
          platform: requestedPlatform,
          issues: [{ message: getPreflightRunnerErrorMessage(error) }],
        })
        return
      }

      if ('issues' in result) {
        failures.push(result)
        return
      }

      if (result.platform !== requestedPlatform) {
        failures.push({
          platform: requestedPlatform,
          issues: [{ message: `Preflight runner returned a mismatched platform result: ${result.platform}.` }],
        })
        return
      }

      platformResults[requestedPlatform] = result.context
    })
  )

  if (failures.length > 0) {
    throw new PreflightError(buildPreflightFailureReport(failures))
  }

  return {
    requestedPlatforms,
    platformResults,
  }
}

function getConfiguredPlatforms(config: NormalizedVoltraConfig): VoltraPlatform[] {
  const platforms: VoltraPlatform[] = []

  if (config.android) {
    platforms.push('android')
  }

  if (config.ios) {
    platforms.push('ios')
  }

  return platforms
}

function validateConfiguredPlatform(config: NormalizedVoltraConfig, platform: VoltraPlatform): void {
  if ((platform === 'android' && config.android) || (platform === 'ios' && config.ios)) {
    return
  }

  throw new PreflightError({
    summary: `Requested platform '${platform}' is not configured.`,
    issues: [{ message: `Add a ${platform} config block or remove --platform ${platform}.` }],
  })
}

function buildPreflightFailureReport(failures: PlatformPreflightFailure[]): PreflightFailureReport {
  const orderedFailures = [...failures].sort((left, right) => comparePlatforms(left.platform, right.platform))

  return {
    summary: 'Preflight failed before any files were written.',
    issues: orderedFailures.flatMap((failure) =>
      failure.issues.map((issue) => ({
        ...issue,
        message: `${failure.platform}: ${issue.message}`,
      }))
    ),
  }
}

function getPreflightRunnerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error)
}

function comparePlatforms(left: VoltraPlatform, right: VoltraPlatform): number {
  return getPlatformSortOrder(left) - getPlatformSortOrder(right)
}

function getPlatformSortOrder(platform: VoltraPlatform): number {
  if (platform === 'android') {
    return 0
  }

  return 1
}
