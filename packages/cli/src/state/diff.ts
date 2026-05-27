import { normalizeTrackedStateFiles, normalizeTrackedStateFilesForDiff } from './files'

import type { VoltraState } from './load'

export interface VoltraStateDiff {
  previousFiles: string[]
  nextFiles: string[]
  staleFiles: string[]
}

export function diffVoltraState(previousState: VoltraState | undefined, nextFiles: string[]): VoltraStateDiff {
  const previousFiles = normalizeTrackedStateFilesForDiff(previousState?.files)
  const normalizedNextFiles = normalizeTrackedStateFiles(nextFiles, 'Next Voltra state files')
  const nextFileSet = new Set(normalizedNextFiles)

  return {
    previousFiles,
    nextFiles: normalizedNextFiles,
    staleFiles: previousFiles.filter((filePath) => !nextFileSet.has(filePath)),
  }
}
