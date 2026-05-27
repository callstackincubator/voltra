import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const UTF8 = 'utf8'

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false
    }

    throw error
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, UTF8)
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readTextFile(filePath)
  return JSON.parse(content) as T
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDirectory(path.dirname(filePath))
  await writeTextFileAtomic(filePath, content)
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export async function removeFileIfExists(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false
    }

    throw error
  }
}

export async function removeDirectoryIfExists(dirPath: string): Promise<boolean> {
  try {
    await fs.rm(dirPath, { recursive: true, force: false })
    return true
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false
    }

    throw error
  }
}

export async function removePathIfExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(targetPath)

    if (stat.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: false })
    } else {
      await fs.unlink(targetPath)
    }

    return true
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false
    }

    throw error
  }
}

async function writeTextFileAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`

  try {
    await fs.writeFile(tempPath, content, UTF8)
    await fs.rename(tempPath, filePath)
  } catch (error: unknown) {
    await removeFileIfExists(tempPath).catch(() => undefined)
    throw error
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
