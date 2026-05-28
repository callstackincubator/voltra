import { execFile } from 'node:child_process'
import type { Readable, Writable } from 'node:stream'
import { promisify } from 'node:util'

import { formatDirtyWorktreeWarning, formatError, VoltraCliError } from '../reporting/summary'

import type * as ClackPrompts from '@clack/prompts'

const execFileAsync = promisify(execFile)

const GIT_NOT_REPOSITORY_EXIT_CODE = 128
export interface GitWorktreeStatus {
  isGitRepository: boolean
  isDirty: boolean
  repoRoot?: string
  entries: string[]
}

export interface EnsureGitWorktreeOptions {
  cwd: string
  interactive?: boolean
  allowDirty?: boolean
  stdin?: Readable & { isTTY?: boolean }
  stdout?: Writable & { isTTY?: boolean }
}

export interface EnsureGitWorktreeResult {
  status: GitWorktreeStatus
  warning?: string
}

interface ExecGitOptions {
  cwd: string
}

class GitCommandError extends VoltraCliError {
  readonly args: string[]
  readonly exitCode?: number
  readonly stderr?: string

  constructor(args: string[], cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause)
    super(`Failed to run git ${args.join(' ')}: ${message}`)
    this.name = 'GitCommandError'
    this.args = args
    this.exitCode = getExecExitCode(cause)
    this.stderr = getExecStderr(cause)
  }
}

export async function getGitWorktreeStatus(cwd: string): Promise<GitWorktreeStatus> {
  const insideWorktree = await runGitCommand(['rev-parse', '--is-inside-work-tree'], { cwd }).catch((error: unknown) => {
    if (isNotGitRepositoryError(error)) {
      return undefined
    }

    throw error
  })

  if (!insideWorktree || insideWorktree.trim() !== 'true') {
    return {
      isGitRepository: false,
      isDirty: false,
      entries: [],
    }
  }

  const [repoRootOutput, statusOutput] = await Promise.all([
    runGitCommand(['rev-parse', '--show-toplevel'], { cwd }),
    runGitCommand(['status', '--short', '--untracked-files=normal'], { cwd }),
  ])

  const entries = splitGitStatusEntries(statusOutput)

  return {
    isGitRepository: true,
    isDirty: entries.length > 0,
    repoRoot: repoRootOutput.trim(),
    entries,
  }
}

export async function ensureGitWorktreeIsReady(options: EnsureGitWorktreeOptions): Promise<EnsureGitWorktreeResult> {
  const status = await getGitWorktreeStatus(options.cwd)

  if (!status.isGitRepository || !status.isDirty) {
    return { status }
  }

  const warning = formatDirtyWorktreeWarning(status.entries.length)

  if (options.allowDirty) {
    return { status, warning }
  }

  if (!isInteractiveSession(options)) {
    throw new VoltraCliError(`${warning} Re-run interactively to confirm before applying changes.`)
  }

  const confirmed = await promptForDirtyWorktreeConfirmation(options, warning)

  if (!confirmed) {
    throw new VoltraCliError('Aborted because the git worktree has uncommitted changes.')
  }

  return { status, warning }
}

async function runGitCommand(args: string[], options: ExecGitOptions): Promise<string> {
  try {
    const result = await execFileAsync('git', args, {
      cwd: options.cwd,
      encoding: 'utf8',
    })

    return result.stdout
  } catch (error: unknown) {
    throw new GitCommandError(args, error)
  }
}

function isNotGitRepositoryError(error: unknown): boolean {
  if (!(error instanceof GitCommandError)) {
    return false
  }

  return (
    error.args.join(' ') === 'rev-parse --is-inside-work-tree' &&
    error.exitCode === GIT_NOT_REPOSITORY_EXIT_CODE &&
    typeof error.stderr === 'string' &&
    error.stderr.toLowerCase().includes('not a git repository')
  )
}

function getExecExitCode(error: unknown): number | undefined {
  if (!(error instanceof Error) || !('code' in error)) {
    return undefined
  }

  const code = error.code

  return typeof code === 'number' ? code : undefined
}

function getExecStderr(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('stderr' in error)) {
    return undefined
  }

  const stderr = error.stderr

  return typeof stderr === 'string' ? stderr : undefined
}

function splitGitStatusEntries(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((entry) => entry.trimEnd())
    .filter((entry) => entry.length > 0)
}

function isInteractiveSession(options: EnsureGitWorktreeOptions): boolean {
  if (options.interactive !== undefined) {
    return options.interactive
  }

  const stdin = options.stdin ?? process.stdin
  const stdout = options.stdout ?? process.stdout

  return Boolean(stdin.isTTY && stdout.isTTY)
}

async function promptForDirtyWorktreeConfirmation(options: EnsureGitWorktreeOptions, warning: string): Promise<boolean> {
  const stdin = options.stdin ?? process.stdin
  const stdout = options.stdout ?? process.stdout
  const { confirm, isCancel } = await loadClackPrompts()

  stdout.write(`${warning}\n`)

  const response = await confirm({
    message: 'Continue anyway?',
    initialValue: false,
    input: stdin,
    output: stdout,
  })

  if (isCancel(response)) {
    stdout.write(`${formatError('Cancelled.')}\n`)
    return false
  }

  return response === true
}

function loadClackPrompts() {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<typeof ClackPrompts>

  return dynamicImport('@clack/prompts')
}
