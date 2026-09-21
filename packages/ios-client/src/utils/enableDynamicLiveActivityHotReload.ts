import { getFastRefreshHub } from '@use-voltra/ios'

import { getNativeVoltra } from '../VoltraModule.js'

declare global {
  var __voltraDynamicLiveActivityDefinitionUpdated: ((definitionId: string) => void) | undefined
}

/**
 * Reload Dynamic Live Activities after a Metro Fast Refresh patch. When Metro
 * re-evaluates a generated definition entry, only that definition is reloaded.
 * Component-only refresh boundaries do not re-evaluate their importer, so those
 * patches fall back to reloading every Dynamic Live Activity definition.
 * Legacy activities and Dynamic Widgets are unaffected.
 *
 * Subscribes to the shared {@link getFastRefreshHub} so multiple `__accept`
 * calls from one save collapse into a single native reload.
 */
export function enableDynamicLiveActivityHotReload(): () => void {
  if (!__DEV__) return () => {}

  const hub = getFastRefreshHub()
  const previousDefinitionUpdated = global.__voltraDynamicLiveActivityDefinitionUpdated
  const updatedDefinitionIds = new Set<string>()

  global.__voltraDynamicLiveActivityDefinitionUpdated = (definitionId) => {
    // A generated entry re-evaluated inside a patch: batch it so the debounced
    // flush reloads each changed definition exactly once. A signal that arrives
    // outside a patch (the first require of a definition) has no flush coming,
    // so reload it immediately.
    if (hub.isAccepting) {
      updatedDefinitionIds.add(definitionId)
      return
    }
    void getNativeVoltra().reloadDynamicLiveActivities([definitionId])
  }

  const unsubscribe = hub.onPatch(() => {
    const definitionIds = Array.from(updatedDefinitionIds)
    updatedDefinitionIds.clear()
    // No definition re-evaluated during this patch: a component-only boundary
    // changed, so fall back to reloading every definition (null).
    void getNativeVoltra().reloadDynamicLiveActivities(definitionIds.length > 0 ? definitionIds : null)
  })

  return () => {
    unsubscribe()
    global.__voltraDynamicLiveActivityDefinitionUpdated = previousDefinitionUpdated
  }
}
