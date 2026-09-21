import { createRequire } from 'node:module'
import path from 'node:path'

import type { NormalizedVoltraConfig } from '../config/types'

/**
 * A Dynamic Widget renders on device from a per-widget JS bundle that `@use-voltra/metro` produces:
 * the dev server serves it at `/voltra/widgets/<id>.bundle`, and the release bundler reads the same
 * registry. Without the package there is no bundle, and the widget silently draws its prerendered
 * `initialStatePath` forever while its server updates keep fetching — a failure that otherwise shows
 * up only as one `Log.w` line in logcat.
 *
 * Resolution from the project root is the same signal the generated Xcode build phase and Gradle
 * task already use (`platforms/ios/xcodeTarget.ts`, `platforms/android/gradle.ts`), so a project
 * that passes here is a project whose release bundling can run.
 *
 * This deliberately does not try to decide whether the app's Metro config is *wired up* — whether
 * `withVoltra` wraps it. That cannot be read off the config source without warning at correct
 * projects: a config that delegates to a shared preset (`module.exports =
 * require('@myorg/metro-config')(__dirname)`) applies the wrapper somewhere this cannot see, and a
 * config hand-composed from `createVoltraMiddleware` and `createWidgetRegistry` never names
 * `withVoltra` at all. A warning that fires on a working setup costs more than the one it catches.
 */
export function findMissingMetroPackageWarning(config: NormalizedVoltraConfig): string | undefined {
  if (!hasDynamicWidget(config)) {
    return undefined
  }

  if (canResolveVoltraMetro(config.projectRoot)) {
    return undefined
  }

  return (
    `This project declares a widget with an 'entry', but '@use-voltra/metro' cannot be resolved from ` +
    `${config.projectRoot}. Dynamic Widgets render from a bundle only that package produces, so they ` +
    `will keep showing their prerendered initial state. Install '@use-voltra/metro' and wrap the app's ` +
    `Metro config: module.exports = withVoltra(config).`
  )
}

function hasDynamicWidget(config: NormalizedVoltraConfig): boolean {
  const widgets = [...(config.android?.widgets ?? []), ...(config.ios?.widgets ?? [])]

  return widgets.some((widget) => widget.entry !== undefined)
}

function canResolveVoltraMetro(projectRoot: string): boolean {
  try {
    createRequire(path.join(projectRoot, 'package.json')).resolve('@use-voltra/metro/bundle-widgets')
    return true
  } catch {
    return false
  }
}
