/**
 * The `react-native` surface available to Voltra widget code.
 *
 * Widget code does not run against the React Native runtime: at build time it is
 * evaluated in a Node VM, and on device it runs in a separate JS engine with no
 * bridge and no native modules. Only the parts of `react-native` that are pure
 * data manipulation can be honoured, so this shim implements `StyleSheet` and
 * `Platform` and rejects everything else with an actionable message instead of
 * silently handing back `undefined`.
 */

import { describeUnsupportedReactNativeExport, type WidgetModulePlatform } from '../widget-module/policy'

type Style = Record<string, unknown>
type StyleInput = Style | false | null | undefined | ReadonlyArray<StyleInput>

function unsupported(symbol: string): never {
  throw new Error(describeUnsupportedReactNativeExport(symbol))
}

const absoluteFillObject: Style = Object.freeze({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
})

function flatten(style: StyleInput): Style {
  if (!style) {
    return {}
  }

  if (!Array.isArray(style)) {
    return style as Style
  }

  const flattened: Style = {}

  for (const entry of style) {
    const resolved = flatten(entry as StyleInput)

    for (const key of Object.keys(resolved)) {
      flattened[key] = resolved[key]
    }
  }

  return flattened
}

/**
 * `StyleSheet` is an identity mapping in Voltra: widget styles are plain objects that
 * are serialized into the widget payload, so there is no registry to allocate ids in.
 */
export const StyleSheet = Object.freeze({
  create<T extends Record<string, Style>>(styles: T): T {
    return styles
  },
  flatten,
  compose(first: StyleInput, second: StyleInput): StyleInput {
    if (first === null || first === undefined) {
      return second
    }

    return second === null || second === undefined ? first : [first, second]
  },
  absoluteFill: absoluteFillObject,
  absoluteFillObject,
  /**
   * Widgets are rendered by the host OS, which does not expose a screen scale to the
   * widget process, so the thinnest expressible line is a single point.
   */
  hairlineWidth: 1,
})

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
