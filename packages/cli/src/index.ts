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

export { applyVoltra } from './apply'
export { CLI_EXIT_CODE_FAILURE, CLI_EXIT_CODE_SUCCESS, getApplyHelpText, runApplyCommand } from './commands/apply'

export { CLI_DEFAULTS } from './config/defaults'
export { VoltraConfigLoadError, loadVoltraConfig } from './config/load'
export { VoltraConfigNormalizationError, normalizeVoltraConfig } from './config/normalize'
export { ensureGitWorktreeIsReady, getGitWorktreeStatus } from './git/status'
export type { EnsureGitWorktreeOptions, EnsureGitWorktreeResult, GitWorktreeStatus } from './git/status'
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
