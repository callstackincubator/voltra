import { getNativeVoltra } from '../VoltraModule.js'

declare global {
  var __voltraDynamicLiveActivityDefinitionUpdated: ((definitionId: string) => void) | undefined
}

/**
 * Reload only the supplied Dynamic Live Activity definitions after a Metro Fast
 * Refresh patch. The generated definition module reports its own ID after Metro
 * re-evaluates it, so only that definition's active instances are refreshed;
 * legacy activities and Dynamic Widgets are unaffected.
 */
export function enableDynamicLiveActivityHotReload(): () => void {
  if (!__DEV__) return () => {}

  const previous = global.__voltraDynamicLiveActivityDefinitionUpdated
  global.__voltraDynamicLiveActivityDefinitionUpdated = (definitionId) => {
    void getNativeVoltra().reloadDynamicLiveActivities([definitionId])
  }

  return () => {
    global.__voltraDynamicLiveActivityDefinitionUpdated = previous
  }
}
