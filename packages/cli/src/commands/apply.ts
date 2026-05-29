import { Command } from 'commander'

import { applyVoltra } from '../apply'
import { normalizeClackMessage, renderError } from '../reporting/clack'

import type { ApplyOptions } from '../apply'
import type { VoltraPlatform } from '../config/types'

export const CLI_EXIT_CODE_SUCCESS = 0
export const CLI_EXIT_CODE_FAILURE = 1

interface ApplyCommandCliOptions {
  platform?: VoltraPlatform
  config?: string
  yes?: boolean
}

export async function runApplyCommand(argv: string[]): Promise<number> {
  let exitCode = CLI_EXIT_CODE_SUCCESS
  const command = createApplyCommand((nextExitCode) => {
    exitCode = nextExitCode
  })

  try {
    await command.parseAsync(argv, { from: 'user' })
    return exitCode
  } catch (error) {
    return await handleCommanderError(error)
  }
}

export function createApplyCommand(onComplete?: (exitCode: number) => void): Command {
  const command = new Command('apply')

  command
    .description('Apply Voltra changes to the native project')
    .usage('[options]')
    .exitOverride()
    .showHelpAfterError()
    .showSuggestionAfterError()
    .option('-p, --platform <platform>', 'limit apply to a single platform', parsePlatform)
    .option('-c, --config <path>', 'load config from an explicit file path')
    .option('-y, --yes', 'skip the dirty git worktree confirmation prompt')
    .action(async () => {
      const cliOptions = command.opts<ApplyCommandCliOptions>()
      const options = toApplyOptions(cliOptions)
      const result = await applyVoltra(options)

      onComplete?.(result.exitCode)

      if (result.exitCode !== CLI_EXIT_CODE_SUCCESS && result.errorMessage) {
        await renderError(result.errorMessage, { output: process.stderr })
      }
    })

  return command
}

function toApplyOptions(cliOptions: ApplyCommandCliOptions): ApplyOptions {
  if (cliOptions.config !== undefined && !cliOptions.config.trim()) {
    throw new Error('--config must be a non-empty path')
  }

  return {
    platform: cliOptions.platform,
    configPath: cliOptions.config,
    allowDirty: cliOptions.yes,
  }
}

function parsePlatform(value: string): VoltraPlatform {
  if (value === 'android' || value === 'ios') {
    return value
  }

  throw new Error(`Invalid platform '${value}'. Expected 'ios' or 'android'.`)
}

async function handleCommanderError(error: unknown): Promise<number> {
  if (isCommanderError(error)) {
    return isCommanderDisplayError(error) ? CLI_EXIT_CODE_SUCCESS : CLI_EXIT_CODE_FAILURE
  }

  await renderError(formatCommandError(error), { output: process.stderr })
  return CLI_EXIT_CODE_FAILURE
}

function isCommanderDisplayError(error: unknown): error is { code: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'commander.helpDisplayed' || error.code === 'commander.version')
  )
}

function isCommanderError(error: unknown): error is { code: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code.startsWith('commander.')
  )
}

export function formatCommandError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return normalizeClackMessage(message)
}

export function getApplyHelpText(): string {
  return createApplyCommand().helpInformation()
}
