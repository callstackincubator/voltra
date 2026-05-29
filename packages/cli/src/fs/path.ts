import path from 'node:path'

export function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

export function resolveFromRoot(rootDir: string, filePath: string): string {
  return path.resolve(rootDir, filePath)
}

export function resolveOptionalFromRoot(rootDir: string, filePath: string | undefined): string | undefined {
  if (!filePath) {
    return undefined
  }

  return resolveFromRoot(rootDir, filePath)
}

export function toRelativePath(rootDir: string, targetPath: string): string {
  return normalizeRelativePath(path.relative(rootDir, targetPath))
}

export function dirname(filePath: string): string {
  return path.dirname(filePath)
}
