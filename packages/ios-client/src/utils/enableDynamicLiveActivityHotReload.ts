import { getNativeVoltra } from '../VoltraModule.js'

declare global {
  var __accept: (...args: unknown[]) => void
  var __voltraDynamicLiveActivityDefinitionUpdated: ((definitionId: string) => void) | undefined
}

/**
 * Reload Dynamic Live Activities after a Metro Fast Refresh patch. When Metro
 * re-evaluates a generated definition entry, only that definition is reloaded.
 * Component-only refresh boundaries do not re-evaluate their importer, so those
 * patches fall back to reloading every Dynamic Live Activity definition.
 * Legacy activities and Dynamic Widgets are unaffected.
 */
export function enableDynamicLiveActivityHotReload(): () => void {
  if (!__DEV__) return () => {}

  const previousAccept = global.__accept
  const previousDefinitionUpdated = global.__voltraDynamicLiveActivityDefinitionUpdated
  const updatedDefinitionIds = new Set<string>()
  let isAcceptingPatch = false

  global.__voltraDynamicLiveActivityDefinitionUpdated = (definitionId) => {
    if (isAcceptingPatch) {
      updatedDefinitionIds.add(definitionId)
      return
    }
    void getNativeVoltra().reloadDynamicLiveActivities([definitionId])
  }
  global.__accept = (...args) => {
    updatedDefinitionIds.clear()
    isAcceptingPatch = true
    try {
      previousAccept?.(...args)
    } finally {
      isAcceptingPatch = false
    }

    const definitionIds = Array.from(updatedDefinitionIds)
    void getNativeVoltra().reloadDynamicLiveActivities(definitionIds.length > 0 ? definitionIds : null)
  }

  return () => {
    global.__accept = previousAccept
    global.__voltraDynamicLiveActivityDefinitionUpdated = previousDefinitionUpdated
  }
}
