import { applyVoltra } from '../apply'
import { formatError } from '../reporting/summary'

import type { ApplyOptions } from '../apply'
import type { VoltraPlatform } from '../config/types'

export const CLI_EXIT_CODE_SUCCESS = 0
export const CLI_EXIT_CODE_FAILURE = 1

const APPLY_HELP_TEXT = [
  'Usage:',
  '  voltra apply [--platform ios|android] [--config <path>]',
  '',
  'Options:',
  '  --platform <platform>  Limit apply to a single platform.',
  '  --config <path>        Load config from an explicit file path.',
  '  -h, --help             Show this help text.',
].join('\n')

export async function runApplyCommand(argv: string[]): Promise<number> {
  const parsed = parseApplyCommandArgs(argv)

  if ('exitCode' in parsed) {
    return parsed.exitCode
  }

  const result = await applyVoltra(parsed.options)

  if (result.exitCode !== CLI_EXIT_CODE_SUCCESS && result.errorMessage) {
    process.stderr.write(`${formatError(result.errorMessage)}\n`)
  }

  return result.exitCode
}

interface ParsedApplyCommandArgs {
  options: ApplyOptions
}

interface ParsedApplyCommandEarlyExit {
  exitCode: number
}

function parseApplyCommandArgs(argv: string[]): ParsedApplyCommandArgs | ParsedApplyCommandEarlyExit {
  const options: ApplyOptions = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${APPLY_HELP_TEXT}\n`)
      return { exitCode: CLI_EXIT_CODE_SUCCESS }
    }

    if (arg === '--platform' || arg.startsWith('--platform=')) {
      const value = readFlagValue(arg, argv[index + 1], '--platform')
      if (arg === '--platform') {
        index += 1
      }

      options.platform = parsePlatform(value)
      continue
    }

    if (arg === '--config' || arg.startsWith('--config=')) {
      const value = readFlagValue(arg, argv[index + 1], '--config')
      if (arg === '--config') {
        index += 1
      }

      if (!value.trim()) {
        throw new Error('--config must be a non-empty path')
      }

      options.configPath = value
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    }

    throw new Error(`Unexpected argument: ${arg}`)
  }

  return { options }
}

function readFlagValue(arg: string, nextArg: string | undefined, flagName: string): string {
  const equalsIndex = arg.indexOf('=')
  if (equalsIndex >= 0) {
    return arg.slice(equalsIndex + 1)
  }

  if (nextArg === undefined) {
    throw new Error(`Missing value for ${flagName}`)
  }

  return nextArg
}

function parsePlatform(value: string): VoltraPlatform {
  if (value === 'android' || value === 'ios') {
    return value
  }

  throw new Error(`Invalid platform '${value}'. Expected 'ios' or 'android'.`)
}

export function formatCommandError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return formatError(message)
}

export function getApplyHelpText(): string {
  return APPLY_HELP_TEXT
}
