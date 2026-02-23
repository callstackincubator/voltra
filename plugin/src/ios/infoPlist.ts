import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

import type { WidgetConfig } from '../types'

export interface ConfigureInfoPlistProps {
  groupIdentifier?: string
  widgetIds?: string[]
  widgets?: WidgetConfig[]
  keychainGroup?: string
}

/**
 * Configures main app Info.plist for Live Activities and widgets.
 *
 * This adds:
 * - NSSupportsLiveActivities: Enables Live Activities support
 * - Voltra_AppGroupIdentifier: App group ID for widget communication (if provided)
 * - Voltra_WidgetIds: Array of widget IDs for native module access (if provided)
 * - Voltra_WidgetServerUrls: Map of widget IDs to server URLs (if any widgets have serverUpdate)
 * - Voltra_WidgetServerIntervals: Map of widget IDs to update intervals (if any widgets have serverUpdate)
 * - Voltra_KeychainGroup: Keychain access group for shared credentials (if provided)
 */
export const configureInfoPlist: ConfigPlugin<ConfigureInfoPlistProps> = (config, props = {}) => {
  return withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true
    mod.modResults.NSSupportsLiveActivitiesFrequentUpdates = false

    // Only add group identifier if provided
    if (props.groupIdentifier) {
      mod.modResults.Voltra_AppGroupIdentifier = props.groupIdentifier
    }

    // Store widget IDs in Info.plist for native module to access
    if (props.widgetIds && props.widgetIds.length > 0) {
      mod.modResults.Voltra_WidgetIds = props.widgetIds
    }

    // Configure server update URLs and intervals for widgets
    if (props.widgets && props.widgets.length > 0) {
      const serverUrls: Record<string, string> = {}
      const serverIntervals: Record<string, number> = {}

      for (const widget of props.widgets) {
        if (widget.serverUpdate) {
          serverUrls[widget.id] = widget.serverUpdate.url
          serverIntervals[widget.id] = widget.serverUpdate.intervalMinutes ?? 15
        }
      }

      if (Object.keys(serverUrls).length > 0) {
        mod.modResults.Voltra_WidgetServerUrls = serverUrls
        mod.modResults.Voltra_WidgetServerIntervals = serverIntervals
      }
    }

    // Store Keychain group identifier for shared credential access
    if (props.keychainGroup) {
      mod.modResults.Voltra_KeychainGroup = props.keychainGroup
    }

    return mod
  })
}
