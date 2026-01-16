import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import type { WidgetConfig } from '../../types'
import { configureEasBuild } from './eas'
import { generateWidgetExtensionFiles } from './files'
import { configureMainAppPlist } from './plist'
import { configurePodfile } from './podfile'
import { configureXcodeProject } from './xcode'

export interface WithIOSProps {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
  widgets?: WidgetConfig[]
  groupIdentifier?: string
}

/**
 * Main iOS configuration plugin.
 *
 * This orchestrates all iOS-related configuration in the correct order:
 * 1. Generate widget extension files (Swift, assets, plist, entitlements)
 * 2. Configure Xcode project (targets, build phases, groups)
 * 3. Configure Podfile for widget extension
 * 4. Configure main app Info.plist (URL schemes)
 * 5. Configure EAS build settings
 */
export const withIOS: ConfigPlugin<WithIOSProps> = (config, props) => {
  const { targetName, bundleIdentifier, deploymentTarget, widgets, groupIdentifier } = props

  return withPlugins(config, [
    // 1. Generate widget extension files (must run first so files exist)
    [generateWidgetExtensionFiles, { targetName, widgets, groupIdentifier }],

    // 2. Configure Xcode project (must run after files are generated)
    [configureXcodeProject, { targetName, bundleIdentifier, deploymentTarget }],

    // 3. Configure Podfile for widget extension target
    [configurePodfile, { targetName }],

    // 4. Configure main app Info.plist (URL schemes, widget extension plist)
    [configureMainAppPlist, { targetName, groupIdentifier }],

    // 5. Configure EAS build settings
    [configureEasBuild, { targetName, bundleIdentifier, groupIdentifier }],
  ])
}
