const HELP_TEXT = [
  'voltra',
  '',
  'Usage:',
  '  voltra apply [--platform ios|android] [--config <path>]',
  '',
  'Status:',
  '  CLI scaffolding is ready. The apply command is not implemented yet.',
].join('\n')

export async function runCli(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${HELP_TEXT}\n`)
    return 0
  }

  process.stderr.write('voltra apply is not implemented yet. Run `voltra --help` for usage.\n')
  return 1
}

export { CLI_DEFAULTS } from './config/defaults'
export { VoltraConfigLoadError, loadVoltraConfig } from './config/load'
export { VoltraConfigNormalizationError, normalizeVoltraConfig } from './config/normalize'
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
