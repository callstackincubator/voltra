import { resolveWidgetServerUpdate } from '@use-voltra/expo-plugin'

import type { ResolvedWidgetServerUpdateConfig, WidgetServerUpdateRules } from '@use-voltra/expo-plugin'

import type { IOSWidgetConfig } from '../types'

/**
 * iOS payload widgets have always defaulted to 15 minutes and accepted anything down to 1, since
 * WidgetKit stretches a timeline it cannot honour rather than refusing it. A widget with an
 * `entry` follows ADR 0002 instead: default 15, floor 15 on both platforms.
 */
export function iosServerUpdateRules(widget: Pick<IOSWidgetConfig, 'entry'>): WidgetServerUpdateRules {
  return {
    hasEntry: widget.entry !== undefined,
    defaultIntervalMinutes: 15,
    minimumIntervalMinutes: 1,
  }
}

/** `serverUpdate` with defaults applied, as the plist and Swift generators consume it. */
export function resolveIOSWidgetServerUpdate(
  widget: Pick<IOSWidgetConfig, 'entry' | 'serverUpdate'>
): ResolvedWidgetServerUpdateConfig | undefined {
  if (widget.serverUpdate === undefined) {
    return undefined
  }

  return resolveWidgetServerUpdate(widget.serverUpdate, iosServerUpdateRules(widget))
}
