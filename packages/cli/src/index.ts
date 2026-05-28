import { CLI_EXIT_CODE_FAILURE, CLI_EXIT_CODE_SUCCESS, formatCommandError, runApplyCommand } from './commands/apply'

const HELP_TEXT = [
  'voltra',
  '',
  'Usage:',
  '  voltra apply [--platform ios|android] [--config <path>]',
  '  voltra --help',
].join('\n')

export async function runCli(argv: string[]): Promise<number> {
  if (argv.length === 0) {
    process.stdout.write(`${HELP_TEXT}\n`)
    return CLI_EXIT_CODE_SUCCESS
  }

  if (argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(`${HELP_TEXT}\n`)
    return CLI_EXIT_CODE_SUCCESS
  }

  const [command, ...commandArgs] = argv

  try {
    if (command === 'apply') {
      return await runApplyCommand(commandArgs)
    }

    throw new Error(`Unknown command: ${command}`)
  } catch (error) {
    process.stderr.write(`${formatCommandError(error)}\n`)
    return CLI_EXIT_CODE_FAILURE
  }
}

export { applyVoltra, runApplyPipeline } from './apply'
export type { ApplyDependencies, ApplyOptions, ApplyResult, PlatformApplyContext, PlatformApplyResult, PlatformApplyRunner } from './apply'
export { getRequestedPlatforms, runApplyPreflight } from './apply/preflight'
export type {
  ApplyPreflightContext,
  ApplyPreflightResult,
  ApplyPreflightRunners,
  PlatformPreflightFailure,
  PlatformPreflightResult,
  PlatformPreflightRunner,
  PlatformPreflightSuccess,
} from './apply/preflight'
export { CLI_EXIT_CODE_FAILURE, CLI_EXIT_CODE_SUCCESS, getApplyHelpText, runApplyCommand } from './commands/apply'

export { CLI_DEFAULTS } from './config/defaults'
export { VoltraConfigLoadError, loadVoltraConfig } from './config/load'
export { VoltraConfigNormalizationError, normalizeVoltraConfig } from './config/normalize'
export { AndroidProjectDiscoveryError, discoverAndroidProject } from './discovery/android'
export type { AndroidProjectDiscovery } from './discovery/android'
export { IOSProjectDiscoveryError, discoverIOSProject } from './discovery/ios'
export type { IOSProjectDiscovery } from './discovery/ios'
export { ensureGitWorktreeIsReady, getGitWorktreeStatus } from './git/status'
export type { EnsureGitWorktreeOptions, EnsureGitWorktreeResult, GitWorktreeStatus } from './git/status'
export { AndroidGeneratedFilesError, generateAndroidFiles } from './platforms/android/generated'
export type { GenerateAndroidFilesOptions, GenerateAndroidFilesResult } from './platforms/android/generated'
export { applyAndroidPlatform, createAndroidPreflightRunner } from './platforms/android/apply'
export { AndroidManifestMutationError, ensureAndroidManifest } from './platforms/android/manifest'
export type { EnsureAndroidManifestOptions, EnsureAndroidManifestResult } from './platforms/android/manifest'
export { IOSGeneratedFilesError, generateIOSFiles } from './platforms/ios/generated'
export type { GenerateIOSFilesOptions, GenerateIOSFilesResult } from './platforms/ios/generated'
export { resolveIOSWidgetTargetName } from './platforms/ios/targetName'
export { IOSWidgetTargetMutationError, ensureIOSWidgetTarget } from './platforms/ios/xcodeTarget'
export { applyIOSPlatform, createIOSPreflightRunner } from './platforms/ios/apply'
export { IOSEntitlementsMutationError, ensureEntitlements } from './platforms/ios/entitlements'
export type { EnsureEntitlementsOptions, EnsureEntitlementsResult } from './platforms/ios/entitlements'
export { IOSInfoPlistMutationError, ensureInfoPlist } from './platforms/ios/plist'
export type { EnsureInfoPlistOptions, EnsureInfoPlistResult } from './platforms/ios/plist'
export { IOSPodfileMutationError, ensurePodfileBlock } from './platforms/ios/podfile'
export type { EnsurePodfileBlockOptions, EnsurePodfileBlockResult } from './platforms/ios/podfile'
export type { EnsureIOSWidgetTargetOptions, EnsureIOSWidgetTargetResult } from './platforms/ios/xcodeTarget'
export {
  ensureFrameworksGroup,
  ensureMainGroupChild,
  ensureProductsGroup,
  getApplicationTargets,
  getTargetBuildConfigurations,
  getTargetBuildPhases,
  IOSXcodeProjectError,
  openIOSXcodeProject,
  saveIOSXcodeProject,
} from './platforms/ios/xcode'
export type {
  IOSXcodeProjectContext,
  IOSXcodeTargetBuildConfigurations,
  IOSXcodeTargetBuildPhases,
  IOSXcodeTargetContext,
} from './platforms/ios/xcode'
export { diffVoltraState } from './state/diff'
export { getVoltraStatePath, loadVoltraState } from './state/load'
export { saveVoltraState } from './state/save'
export type { VoltraStateDiff } from './state/diff'
export type { SaveVoltraStateInput } from './state/save'
export type { VoltraState } from './state/load'
export {
  formatAmbiguousDiscoveryWarning,
  formatApplySummary,
  formatDirtyWorktreeWarning,
  formatError,
  formatPreflightFailure,
  formatWarning,
  PreflightError,
  VoltraCliError,
} from './reporting/summary'
export type {
  AndroidProjectOverrides,
  AndroidWidgetConfig,
  AndroidWidgetServerUpdateConfig,
  CliDefaults,
  IOSProjectOverrides,
  IOSWidgetConfig,
  IOSWidgetFamily,
  IOSWidgetServerUpdateConfig,
  LoadedVoltraConfig,
  NormalizedAndroidProjectConfig,
  NormalizedAndroidWidgetConfig,
  NormalizedAndroidWidgetServerUpdateConfig,
  NormalizedIOSProjectConfig,
  NormalizedIOSWidgetConfig,
  NormalizedIOSWidgetServerUpdateConfig,
  NormalizedVoltraAndroidConfig,
  NormalizedVoltraConfig,
  NormalizedVoltraIOSConfig,
  VoltraAndroidConfig,
  VoltraConfig,
  VoltraIOSConfig,
  VoltraPlatform,
  WidgetInitialStatePath,
  WidgetLabel,
  WidgetLocalizedValue,
} from './config/types'
export type { ApplySummary, PreflightFailureReport, PreflightIssue, ReportedChange, ReportedChangeKind } from './reporting/summary'
