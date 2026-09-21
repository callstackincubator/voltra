import { createWidgetModuleLoader, type WidgetModuleLoader } from '@use-voltra/compiler'

import type { VoltraPlatform } from '../../config/types'

export interface WidgetModuleBuildInfo {
  isDev: false
  metroUrl: null
  appVersion: 'unknown'
  voltraVersion: string
}

export function createDynamicWidgetBuildInfo(voltraVersion: string): WidgetModuleBuildInfo {
  return {
    isDev: false,
    metroUrl: null,
    appVersion: 'unknown',
    voltraVersion,
  }
}

/**
 * Loader used by the apply pipeline to evaluate widget source at build time.
 *
 * The evaluation rules — which imports are allowed and what they resolve to — live in
 * `@use-voltra/compiler` so that `voltra apply`, the Expo config plugins, and the Metro
 * widget bundler all apply the same contract.
 */
export function createGeneratedWidgetModuleLoader(
  projectRoot: string,
  platform: VoltraPlatform,
  createError: (message: string) => Error,
  onWarning?: (message: string) => void
): WidgetModuleLoader {
  return createWidgetModuleLoader({ projectRoot, platform, createError, onWarning })
}
