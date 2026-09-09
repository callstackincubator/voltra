import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

import type { IOSWidgetConfig } from '../types'
import { resolveIOSWidgetServerUpdate } from './serverUpdate'

export interface ConfigureInfoPlistProps {
  groupIdentifier?: string
  widgetIds?: string[]
  widgets?: IOSWidgetConfig[]
  keychainGroup?: string
  voltraVersion: string
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
export const configureInfoPlist: ConfigPlugin<ConfigureInfoPlistProps> = (config, props) => {
  return withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true
    mod.modResults.NSSupportsLiveActivitiesFrequentUpdates = false
    mod.modResults.Voltra_Version = props.voltraVersion

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
        const serverUpdate = resolveIOSWidgetServerUpdate(widget)

        if (!serverUpdate) {
          continue
        }

        // Every server-driven widget gets an interval, so this dictionary's keys are the set of
        // server-driven widget ids the runtime settings store validates against. A URL is written
        // only when app.json set one; otherwise the app supplies it with setWidgetServerUpdate.
        serverIntervals[widget.id] = serverUpdate.intervalMinutes

        if (serverUpdate.url !== undefined) {
          serverUrls[widget.id] = serverUpdate.url
        }
      }

      if (Object.keys(serverIntervals).length > 0) {
        mod.modResults.Voltra_WidgetServerIntervals = serverIntervals
      }

      if (Object.keys(serverUrls).length > 0) {
        mod.modResults.Voltra_WidgetServerUrls = serverUrls
      }
    }

    // Store Keychain group identifier for shared credential access
    if (props.keychainGroup) {
      mod.modResults.Voltra_KeychainGroup = props.keychainGroup
    }

    return mod
  })
}
