import { resolveWidgetServerUpdate } from '@use-voltra/expo-plugin'

import type { ResolvedWidgetServerUpdateConfig, WidgetServerUpdateRules } from '@use-voltra/expo-plugin'

import type { AndroidWidgetConfig } from '../types'

/**
 * Android payload widgets have always defaulted to a 60 minute interval and been floored at the
 * 15 minutes WorkManager can actually honour. A widget with an `entry` follows ADR 0002 instead:
 * default 15, floor 15 on both platforms.
 */
export function androidServerUpdateRules(widget: Pick<AndroidWidgetConfig, 'entry'>): WidgetServerUpdateRules {
  return {
    hasEntry: widget.entry !== undefined,
    defaultIntervalMinutes: 60,
    minimumIntervalMinutes: 15,
  }
}

/** `serverUpdate` with defaults applied, as the Kotlin and asset generators consume it. */
export function resolveAndroidWidgetServerUpdate(
  widget: Pick<AndroidWidgetConfig, 'entry' | 'serverUpdate'>
): ResolvedWidgetServerUpdateConfig | undefined {
  if (widget.serverUpdate === undefined) {
    return undefined
  }

  return resolveWidgetServerUpdate(widget.serverUpdate, androidServerUpdateRules(widget))
}
