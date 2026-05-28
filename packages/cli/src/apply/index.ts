import path from 'node:path'

import { loadVoltraConfig } from '../config/load'
import { normalizeVoltraConfig } from '../config/normalize'
import { removePathIfExists } from '../fs/readWrite'
import { ensureGitWorktreeIsReady } from '../git/status'
import { applyAndroidPlatform, createAndroidPreflightRunner } from '../platforms/android/apply'
import { formatApplySummary, VoltraCliError } from '../reporting/summary'
import { diffVoltraState } from '../state/diff'
import { loadVoltraState } from '../state/load'
import { saveVoltraState } from '../state/save'

import { runApplyPreflight } from './preflight'

import type { NormalizedVoltraConfig, VoltraPlatform } from '../config/types'
import type { ApplyPreflightResult, ApplyPreflightRunners } from './preflight'
import type { ReportedChange } from '../reporting/summary'
import type { VoltraState } from '../state/load'

export interface ApplyOptions {
  configPath?: string
  platform?: VoltraPlatform
}

export interface ApplyResult {
  exitCode: number
  errorMessage?: string
}

export interface PlatformApplyContext {
  config: NormalizedVoltraConfig
  platform: VoltraPlatform
  preflight: unknown
  previousState?: VoltraState
  requestedPlatforms: VoltraPlatform[]
}

export interface PlatformApplyResult {
  platform: VoltraPlatform
  changes: ReportedChange[]
  generatedFiles: string[]
  warnings?: string[]
}

export type PlatformApplyRunner = (context: PlatformApplyContext) => Promise<PlatformApplyResult>

export interface ApplyDependencies {
  applyRunners: Partial<Record<VoltraPlatform, PlatformApplyRunner>>
  preflightRunners: ApplyPreflightRunners
  writeStdout(message: string): void
}

const DEFAULT_DEPENDENCIES: ApplyDependencies = {
  applyRunners: {},
  preflightRunners: {},
  writeStdout(message: string) {
    process.stdout.write(message)
  },
}

export async function applyVoltra(options: ApplyOptions): Promise<ApplyResult> {
  try {
    await runApplyPipeline(options, DEFAULT_DEPENDENCIES)

    return {
      exitCode: 0,
    }
  } catch (error: unknown) {
    return {
      exitCode: 1,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function runApplyPipeline(options: ApplyOptions, dependencies: ApplyDependencies): Promise<void> {
  const loadedConfig = await loadVoltraConfig({ configPath: options.configPath })
  const normalizedConfig = normalizeVoltraConfig(loadedConfig)
  const resolvedDependencies = resolveApplyDependencies(normalizedConfig, dependencies)
  const gitStatus = await ensureGitWorktreeIsReady({ cwd: normalizedConfig.projectRoot })
  const preflight = await runApplyPreflight(normalizedConfig, resolvedDependencies.preflightRunners, options.platform)
  const previousState = await loadVoltraState(normalizedConfig.projectRoot)
  const platformResults = await runPlatformApply(normalizedConfig, preflight, previousState, resolvedDependencies.applyRunners)
  const nextGeneratedFiles = platformResults.flatMap((result) => result.generatedFiles)
  const stateDiff = diffVoltraState(previousState, nextGeneratedFiles)
  const deletedChanges = await removeStaleGeneratedFiles(normalizedConfig.projectRoot, stateDiff.staleFiles)
  await saveVoltraState(normalizedConfig.projectRoot, { files: stateDiff.nextFiles })

  const summaryWarnings = [gitStatus.warning, ...platformResults.flatMap((result) => result.warnings ?? [])].filter(isDefined)
  const summaryChanges = [...platformResults.flatMap((result) => result.changes), ...deletedChanges]

  resolvedDependencies.writeStdout(`${formatApplySummary({ changes: summaryChanges, warnings: summaryWarnings })}\n`)
}

function resolveApplyDependencies(config: NormalizedVoltraConfig, dependencies: ApplyDependencies): ApplyDependencies {
  return {
    applyRunners: {
      android: dependencies.applyRunners.android ?? applyAndroidPlatform,
      ios: dependencies.applyRunners.ios,
    },
    preflightRunners: {
      android: dependencies.preflightRunners.android ?? (config.android ? createAndroidPreflightRunner(config) : undefined),
      ios: dependencies.preflightRunners.ios,
    },
    writeStdout: dependencies.writeStdout,
  }
}

async function runPlatformApply(
  config: NormalizedVoltraConfig,
  preflight: ApplyPreflightResult,
  previousState: VoltraState | undefined,
  applyRunners: Partial<Record<VoltraPlatform, PlatformApplyRunner>>
): Promise<PlatformApplyResult[]> {
  const missingRunners = preflight.requestedPlatforms.filter((platform) => !applyRunners[platform])

  if (missingRunners.length > 0) {
    throw new VoltraCliError(`No apply runner is registered for ${missingRunners.join(', ')}.`)
  }

  const results: PlatformApplyResult[] = []

  for (const platform of preflight.requestedPlatforms) {
    const applyRunner = applyRunners[platform]

    if (!applyRunner) {
      throw new VoltraCliError(`No apply runner is registered for ${platform}.`)
    }

    let result: PlatformApplyResult

    try {
      result = await applyRunner({
        config,
        platform,
        preflight: preflight.platformResults[platform],
        previousState,
        requestedPlatforms: preflight.requestedPlatforms,
      })
    } catch (error: unknown) {
      throw new VoltraCliError(`Apply failed for ${platform}: ${getApplyRunnerErrorMessage(error)}`)
    }

    if (result.platform !== platform) {
      throw new VoltraCliError(`Apply runner returned a mismatched platform result: expected ${platform}, received ${result.platform}.`)
    }

    results.push(result)
  }

  return results
}

async function removeStaleGeneratedFiles(projectRoot: string, staleFiles: string[]): Promise<ReportedChange[]> {
  const deletedChanges: ReportedChange[] = []

  for (const staleFile of staleFiles) {
    const staleFilePath = path.join(projectRoot, staleFile)
    let deleted: boolean

    try {
      deleted = await removePathIfExists(staleFilePath)
    } catch (error: unknown) {
      throw new VoltraCliError(`Failed to remove stale generated file ${staleFile}: ${getApplyRunnerErrorMessage(error)}`)
    }

    if (deleted) {
      deletedChanges.push({
        kind: 'deleted',
        path: staleFile,
      })
    }
  }

  return deletedChanges
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined
}

function getApplyRunnerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return String(error)
}
