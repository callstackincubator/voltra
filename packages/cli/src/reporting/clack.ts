import type { Readable, Writable } from 'node:stream'

import type * as ClackPrompts from '@clack/prompts'

import type { ApplySummary } from './summary'

interface CommonClackOptions {
  input?: Readable
  output?: Writable
}

export async function renderApplySummary(summary: ApplySummary, options?: CommonClackOptions): Promise<void> {
  const { outro, log } = await loadClackPrompts()

  for (const kind of ['created', 'updated', 'deleted'] as const) {
    const paths = summary.changes.filter((change) => change.kind === kind).map((change) => change.path)

    for (const filePath of paths) {
      log.step(`${capitalize(kind)} ${filePath}`, options)
    }
  }

  for (const warning of summary.warnings ?? []) {
    log.warn(normalizeClackMessage(warning), options)
  }

  outro('Done', options)
}

export async function renderError(message: string, options?: CommonClackOptions): Promise<void> {
  const { log } = await loadClackPrompts()
  log.error(normalizeClackMessage(message), options)
}

export async function renderWarning(message: string, options?: CommonClackOptions): Promise<void> {
  const { log } = await loadClackPrompts()
  log.warn(normalizeClackMessage(message), options)
}

export async function renderCancelled(options?: CommonClackOptions): Promise<void> {
  const { cancel } = await loadClackPrompts()
  cancel('Cancelled.', options)
}

export async function renderIntro(options?: CommonClackOptions): Promise<void> {
  const { intro } = await loadClackPrompts()
  intro('Voltra', options)
}

export function normalizeClackMessage(message: string): string {
  return message
    .split('\n')
    .map((line) => line.replace(/^\[voltra\]\s*(Warning:\s*|Error:\s*|Preflight:\s*)?/, ''))
    .join('\n')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function loadClackPrompts() {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<typeof ClackPrompts>

  return dynamicImport('@clack/prompts')
}
