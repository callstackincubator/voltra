/**
 * `Platform` as widget code sees it.
 *
 * Kept out of `shim.ts` so that module holds only the widget-visible surface and the
 * per-platform entry points can re-export it wholesale.
 */

import { describeUnsupportedReactNativeExport, type WidgetModulePlatform } from '../widget-module/policy.js'

function unsupported(symbol: string): never {
  throw new Error(describeUnsupportedReactNativeExport(symbol))
}

export type WidgetPlatform = {
  readonly OS: WidgetModulePlatform
  select<T>(specifics: PlatformSelectSpec<T>): T | undefined
}

type PlatformSelectSpec<T> = {
  ios?: T
  android?: T
  native?: T
  default?: T
}

export function createPlatform(platform: WidgetModulePlatform): WidgetPlatform {
  return Object.freeze({
    OS: platform,
    select<T>(specifics: PlatformSelectSpec<T>): T | undefined {
      if (specifics && platform in specifics) {
        return specifics[platform]
      }

      if (specifics && 'native' in specifics) {
        return specifics.native
      }

      return specifics?.default
    },
    get Version(): never {
      return unsupported('Platform.Version')
    },
    get constants(): never {
      return unsupported('Platform.constants')
    },
    get isTV(): never {
      return unsupported('Platform.isTV')
    },
    get isTesting(): never {
      return unsupported('Platform.isTesting')
    },
  }) as WidgetPlatform
}
