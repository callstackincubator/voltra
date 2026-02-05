import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins'

export interface ConfigureInfoPlistProps {
  groupIdentifier?: string
  widgetIds?: string[]
}

/**
 * Configures main app Info.plist for Live Activities and widgets.
 *
 * This adds:
 * - NSSupportsLiveActivities: Enables Live Activities support
 * - Voltra_AppGroupIdentifier: App group ID for widget communication (if provided)
 * - Voltra_WidgetIds: Array of widget IDs for native module access (if provided)
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

    return mod
  })
}
