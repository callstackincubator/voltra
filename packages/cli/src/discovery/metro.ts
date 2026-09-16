import path from 'node:path'

import { pathExists, readTextFile } from '../fs/readWrite'

import type { NormalizedVoltraConfig } from '../config/types'

/** The names Metro itself resolves, in the order it tries them. */
const METRO_CONFIG_FILENAMES = ['metro.config.js', 'metro.config.cjs', 'metro.config.mjs', 'metro.config.ts']

/**
 * A Dynamic Widget renders on device from a per-widget JS bundle that only exists if the app's
 * Metro config is wrapped with `withVoltra`: the dev server serves it at
 * `/voltra/widgets/<id>.bundle`, and the release bundler reads the same registry. Without the
 * wrapper the bundle never loads, and the widget silently draws its prerendered `initialStatePath`
 * forever while its server updates still fetch — a failure that otherwise only shows up as one
 * `Log.w` line in logcat.
 *
 * Reported as a warning rather than an error: the check reads source text, so an app that composes
 * its Metro config in a way this cannot see should not be blocked from applying.
 */
export async function findMissingMetroWrapperWarning(config: NormalizedVoltraConfig): Promise<string | undefined> {
  if (!hasDynamicWidget(config)) {
    return undefined
  }

  const metroConfigPath = await findMetroConfigPath(config.projectRoot)

  if (!metroConfigPath) {
    // No file to read means no evidence either way, and a project can configure Metro from
    // somewhere this does not look. Saying nothing beats a warning nobody can act on.
    return undefined
  }

  const contents = await readTextFile(metroConfigPath)

  if (contents.includes('withVoltra')) {
    return undefined
  }

  return (
    `${path.basename(metroConfigPath)} does not use 'withVoltra', but this project declares a widget ` +
    `with an 'entry'. Dynamic Widgets render from a bundle only the Voltra Metro config serves, so ` +
    `they will keep showing their prerendered initial state. Install '@use-voltra/metro' and wrap the ` +
    `config: module.exports = withVoltra(config).`
  )
}

function hasDynamicWidget(config: NormalizedVoltraConfig): boolean {
  const widgets = [...(config.android?.widgets ?? []), ...(config.ios?.widgets ?? [])]

  return widgets.some((widget) => widget.entry !== undefined)
}

async function findMetroConfigPath(projectRoot: string): Promise<string | undefined> {
  for (const filename of METRO_CONFIG_FILENAMES) {
    const candidate = path.join(projectRoot, filename)

    if (await pathExists(candidate)) {
      return candidate
    }
  }

  return undefined
}
