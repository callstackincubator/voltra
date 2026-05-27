export async function runCli(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write('voltra CLI scaffolding is ready.\n')
    return 0
  }

  process.stderr.write('voltra CLI is not implemented yet.\n')
  return 1
}

export { CLI_DEFAULTS } from './config/defaults'
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
