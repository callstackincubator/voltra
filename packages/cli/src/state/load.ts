import path from 'node:path'

import { pathExists, readJsonFile } from '../fs/readWrite'
import { VoltraCliError } from '../reporting/summary'

import { normalizeTrackedStateFiles } from './files'

const STATE_SCHEMA_VERSION = 1
const STATE_DIRECTORY_NAME = '.voltra'
const STATE_FILE_NAME = 'state.json'

export interface VoltraState {
  schemaVersion: 1
  files: string[]
}

interface RawVoltraState {
  schemaVersion?: unknown
  files?: unknown
}

export async function loadVoltraState(projectRoot: string): Promise<VoltraState | undefined> {
  const statePath = getVoltraStatePath(projectRoot)

  if (!(await pathExists(statePath))) {
    return undefined
  }

  let rawState: RawVoltraState

  try {
    rawState = await readJsonFile<RawVoltraState>(statePath)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new VoltraCliError(`Failed to read Voltra state at ${statePath}: ${message}`)
  }

  return validateVoltraState(rawState, statePath)
}

export function getVoltraStatePath(projectRoot: string): string {
  return path.join(projectRoot, STATE_DIRECTORY_NAME, STATE_FILE_NAME)
}

function validateVoltraState(rawState: RawVoltraState, statePath: string): VoltraState {
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
    throw new VoltraCliError(`Voltra state at ${statePath} must be a JSON object.`)
  }

  if (rawState.schemaVersion !== STATE_SCHEMA_VERSION) {
    throw new VoltraCliError(
      `Unsupported Voltra state schema at ${statePath}: expected ${STATE_SCHEMA_VERSION}, received ${String(
        rawState.schemaVersion
      )}.`
    )
  }

  if (!Array.isArray(rawState.files)) {
    throw new VoltraCliError(`Voltra state at ${statePath} must contain a files array.`)
  }

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    files: normalizeTrackedStateFiles(rawState.files, `Voltra state at ${statePath} files`),
  }
}
