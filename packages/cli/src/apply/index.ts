import path from 'node:path'

import { normalizeRelativePath } from '../fs/path'
import { loadVoltraConfig } from '../config/load'
import { normalizeVoltraConfig } from '../config/normalize'
import { removePathIfExists } from '../fs/readWrite'
import { ensureGitWorktreeIsReady } from '../git/status'
import { applyAndroidPlatform, createAndroidPreflightRunner } from '../platforms/android/apply'
import { applyIOSPlatform, createIOSPreflightRunner } from '../platforms/ios/apply'
import { renderApplySummary, renderIntro } from '../reporting/clack'
import { VoltraCliError } from '../reporting/summary'
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
  allowDirty?: boolean
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
  writeIntro(): Promise<void>
  writeSummary(summary: { changes: ReportedChange[]; warnings?: string[] }): Promise<void>
}

const DEFAULT_DEPENDENCIES: ApplyDependencies = {
  applyRunners: {},
  preflightRunners: {},
  async writeIntro() {
    await renderIntro()
  },
  async writeSummary(summary) {
    await renderApplySummary(summary)
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
  await resolvedDependencies.writeIntro()
  await ensureGitWorktreeIsReady({
    cwd: normalizedConfig.projectRoot,
    allowDirty: options.allowDirty,
  })
  const preflight = await runApplyPreflight(normalizedConfig, resolvedDependencies.preflightRunners, options.platform)
  const previousState = await loadVoltraState(normalizedConfig.projectRoot)
  const platformResults = await runPlatformApply(normalizedConfig, preflight, previousState, resolvedDependencies.applyRunners)
  const nextGeneratedFiles = mergeGeneratedFiles(normalizedConfig, previousState, preflight.requestedPlatforms, platformResults)
  const stateDiff = diffVoltraState(previousState, nextGeneratedFiles)
  const deletedChanges = await removeStaleGeneratedFiles(normalizedConfig.projectRoot, stateDiff.staleFiles)
  await saveVoltraState(normalizedConfig.projectRoot, { files: stateDiff.nextFiles })

  const summaryWarnings = platformResults.flatMap((result) => result.warnings ?? []).filter(isDefined)
  const summaryChanges = [...platformResults.flatMap((result) => result.changes), ...deletedChanges]

  await resolvedDependencies.writeSummary({ changes: summaryChanges, warnings: summaryWarnings })
}

function resolveApplyDependencies(config: NormalizedVoltraConfig, dependencies: ApplyDependencies): ApplyDependencies {
  return {
    applyRunners: {
      android: dependencies.applyRunners.android ?? applyAndroidPlatform,
      ios: dependencies.applyRunners.ios ?? applyIOSPlatform,
    },
    preflightRunners: {
      android: dependencies.preflightRunners.android ?? (config.android ? createAndroidPreflightRunner(config) : undefined),
      ios: dependencies.preflightRunners.ios ?? (config.ios ? createIOSPreflightRunner(config) : undefined),
    },
    writeIntro: dependencies.writeIntro,
    writeSummary: dependencies.writeSummary,
  }
}

function mergeGeneratedFiles(
  config: NormalizedVoltraConfig,
  previousState: VoltraState | undefined,
  requestedPlatforms: VoltraPlatform[],
  platformResults: PlatformApplyResult[]
): string[] {
  const nextGeneratedFilesByPlatform = new Map(platformResults.map((result) => [result.platform, result.generatedFiles] as const))
  const mergedFiles = new Set<string>()
  const platformRoots = getTrackedPlatformRoots(config)
  const configuredPlatforms = getConfiguredPlatforms(config)
  const isPartialApply = requestedPlatforms.length < configuredPlatforms.length

  for (const previousFile of previousState?.files ?? []) {
    const owningPlatform = getTrackedFilePlatform(previousFile, platformRoots)

    if (!owningPlatform) {
      if (isPartialApply) {
        mergedFiles.add(previousFile)
      }

      continue
    }

    if (requestedPlatforms.includes(owningPlatform)) {
      continue
    }

    mergedFiles.add(previousFile)
  }

  for (const platform of requestedPlatforms) {
    for (const filePath of nextGeneratedFilesByPlatform.get(platform) ?? []) {
      mergedFiles.add(filePath)
    }
  }

  return [...mergedFiles]
}

function getTrackedPlatformRoots(config: NormalizedVoltraConfig): Partial<Record<VoltraPlatform, string>> {
  const projectRoot = config.projectRoot
  const androidRoot = config.android ? normalizeRelativePath(path.relative(projectRoot, config.android.project.rootDir ?? path.join(projectRoot, 'android'))) : undefined
  const iosRoot = config.ios ? normalizeRelativePath(path.relative(projectRoot, config.ios.project.rootDir ?? path.join(projectRoot, 'ios'))) : undefined

  return {
    ...(androidRoot ? { android: androidRoot } : {}),
    ...(iosRoot ? { ios: iosRoot } : {}),
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

function getTrackedFilePlatform(
  filePath: string,
  platformRoots: Partial<Record<VoltraPlatform, string>>
): VoltraPlatform | undefined {
  const normalizedFilePath = normalizeRelativePath(filePath)

  for (const platform of ['android', 'ios'] as const) {
    const root = platformRoots[platform]

    if (!root) {
      continue
    }

    if (normalizedFilePath === root || normalizedFilePath.startsWith(`${root}/`)) {
      return platform
    }
  }

  return undefined
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
