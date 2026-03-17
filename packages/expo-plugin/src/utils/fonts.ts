import * as fs from 'fs/promises'
import * as path from 'path'
import { createRequire } from 'module'

import { logger } from './logger'

const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']

async function resolveFontInput(input: string, projectRoot: string): Promise<string | null> {
  const resolvedPath = path.resolve(projectRoot, input)

  try {
    await fs.stat(resolvedPath)
    return resolvedPath
  } catch {
    try {
      const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
      return projectRequire.resolve(input)
    } catch {
      logger.warn(`Could not resolve font path: ${input}`)
      return null
    }
  }
}

export async function resolveFontPaths(fonts: string[], projectRoot: string): Promise<string[]> {
  const promises = fonts.map(async (input) => {
    const resolvedInput = await resolveFontInput(input, projectRoot)
    if (!resolvedInput) {
      return []
    }

    const stat = await fs.stat(resolvedInput)
    if (stat.isDirectory()) {
      const dir = await fs.readdir(resolvedInput)
      return dir.map((file) => path.join(resolvedInput, file))
    }

    return [resolvedInput]
  })

  const results = await Promise.all(promises)
  return results.flat().filter((filePath) => FONT_EXTENSIONS.some((ext) => filePath.endsWith(ext)))
}
