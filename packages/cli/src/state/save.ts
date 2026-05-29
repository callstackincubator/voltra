import { writeJsonFile } from '../fs/readWrite'
import { VoltraCliError } from '../reporting/summary'

import { normalizeTrackedStateFiles } from './files'
import { getVoltraStatePath } from './load'

import type { VoltraState } from './load'

const STATE_SCHEMA_VERSION = 1

export interface SaveVoltraStateInput {
  files: string[]
}

export async function saveVoltraState(projectRoot: string, input: SaveVoltraStateInput): Promise<VoltraState> {
  const state: VoltraState = {
    schemaVersion: STATE_SCHEMA_VERSION,
    files: normalizeTrackedStateFiles(input.files, 'Voltra state files'),
  }

  const statePath = getVoltraStatePath(projectRoot)

  try {
    await writeJsonFile(statePath, state)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new VoltraCliError(`Failed to write Voltra state at ${statePath}: ${message}`)
  }

  return state
}
