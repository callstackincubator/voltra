import path from 'node:path'

import { normalizeRelativePath } from '../fs/path'
import { VoltraCliError } from '../reporting/summary'

export function normalizeTrackedStateFiles(files: string[] | unknown[], errorContext: string): string[] {
  if (!Array.isArray(files)) {
    throw new VoltraCliError(`${errorContext} must be an array.`)
  }

  const seen = new Set<string>()
  const normalizedFiles: string[] = []

  for (const filePath of files) {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new VoltraCliError(`${errorContext} must contain only non-empty relative paths.`)
    }

    const normalizedFilePath = normalizeRelativePath(filePath)

    if (path.isAbsolute(normalizedFilePath) || normalizedFilePath.startsWith('../') || normalizedFilePath === '..') {
      throw new VoltraCliError(`${errorContext} must contain only project-relative paths.`)
    }

    if (seen.has(normalizedFilePath)) {
      continue
    }

    seen.add(normalizedFilePath)
    normalizedFiles.push(normalizedFilePath)
  }

  return normalizedFiles.sort((left, right) => left.localeCompare(right))
}

export function normalizeTrackedStateFilesForDiff(files: string[] | undefined): string[] {
  if (!files || files.length === 0) {
    return []
  }

  return normalizeTrackedStateFiles(files, 'Voltra state files')
}
