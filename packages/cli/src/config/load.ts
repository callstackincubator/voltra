import { dirname, resolve } from 'node:path'

import { cosmiconfig } from 'cosmiconfig'

import type { CosmiconfigResult } from 'cosmiconfig'

import type { LoadedVoltraConfig, VoltraConfig } from './types'

const MODULE_NAME = 'voltra'

export class VoltraConfigLoadError extends Error {
  cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'VoltraConfigLoadError'
    this.cause = cause
  }
}

export interface LoadVoltraConfigOptions {
  configPath?: string
  cwd?: string
}

function getExplorer() {
  return cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      'package.json',
      '.voltrarc',
      '.voltrarc.json',
      '.voltrarc.yaml',
      '.voltrarc.yml',
      '.voltrarc.js',
      '.voltrarc.cjs',
      '.voltrarc.mjs',
      '.voltrarc.ts',
      'voltra.config.json',
      'voltra.config.yaml',
      'voltra.config.yml',
      'voltra.config.js',
      'voltra.config.cjs',
      'voltra.config.mjs',
      'voltra.config.ts',
    ],
  })
}

function toLoadedConfig(result: CosmiconfigResult): LoadedVoltraConfig {
  if (result.isEmpty) {
    throw new VoltraConfigLoadError(`Voltra config file is empty: ${result.filepath}`)
  }

  if (!result.config || typeof result.config !== 'object' || Array.isArray(result.config)) {
    throw new VoltraConfigLoadError(`Voltra config must be an object: ${result.filepath}`)
  }

  return {
    config: result.config as VoltraConfig,
    configPath: result.filepath,
    configDir: dirname(result.filepath),
  }
}

export async function loadVoltraConfig(options: LoadVoltraConfigOptions = {}): Promise<LoadedVoltraConfig> {
  const explorer = getExplorer()

  try {
    if (options.configPath) {
      const configPath = resolve(options.cwd ?? process.cwd(), options.configPath)
      const result = await explorer.load(configPath)

      if (!result) {
        throw new VoltraConfigLoadError(`Voltra config not found at ${configPath}`)
      }

      return toLoadedConfig(result)
    }

    const result = await explorer.search(options.cwd)

    if (!result) {
      throw new VoltraConfigLoadError(
        'No Voltra config found. Checked package.json, .voltrarc*, and voltra.config.* files.'
      )
    }

    return toLoadedConfig(result)
  } catch (error) {
    if (error instanceof VoltraConfigLoadError) {
      throw error
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new VoltraConfigLoadError(
      `Failed to load Voltra config: ${message}`,
      error instanceof Error ? error : undefined
    )
  }
}
