import { ConfigPlugin, withPlugins } from '@expo/config-plugins'

import type { WidgetConfig } from '../../types'
import { configureEasBuild } from './eas'
import { generateWidgetExtensionFiles } from './files'
import { withFonts } from './fonts'
import { configureMainAppPlist } from './plist'
import { configurePodfile } from './podfile'
import { configureXcodeProject } from './xcode'

export interface WithIOSProps {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
  widgets?: WidgetConfig[]
  groupIdentifier?: string
  fonts?: string[]
}

/**
 * Main iOS configuration plugin.
 *
 * This orchestrates all iOS-related configuration in the correct order:
 * 1. Generate widget extension files (Swift, assets, plist, entitlements)
 * 2. Add custom fonts (if provided)
 * 3. Configure Xcode project (targets, build phases, groups)
 * 4. Configure Podfile for widget extension
 * 5. Configure main app Info.plist (URL schemes)
 * 6. Configure EAS build settings
 *
 * NOTE: Expo mods execute in REVERSE registration order. Plugins that depend
 * on modifications from other plugins must be registered BEFORE their dependencies.
 * For example, fonts plugin needs the target created by configureXcodeProject,
 * so fonts must be registered before configureXcodeProject.
 */
export const withIOS: ConfigPlugin<WithIOSProps> = (config, props) => {
  const { targetName, bundleIdentifier, deploymentTarget, widgets, groupIdentifier, fonts } = props

  const plugins: [ConfigPlugin<any>, any][] = [
    // 1. Generate widget extension files (must run first so files exist)
    [generateWidgetExtensionFiles, { targetName, widgets, groupIdentifier }],

    // 2. Add custom fonts if provided
    ...(fonts && fonts.length > 0 ? [[withFonts, { fonts, targetName }] as [ConfigPlugin<any>, any]] : []),

    // 3. Configure Xcode project (creates the target - must run before fonts mod executes)
    [configureXcodeProject, { targetName, bundleIdentifier, deploymentTarget }],

    // 4. Configure Podfile for widget extension target
    [configurePodfile, { targetName }],

    // 5. Configure main app Info.plist (URL schemes, widget extension plist)
    [configureMainAppPlist, { targetName, groupIdentifier }],

    // 6. Configure EAS build settings
    [configureEasBuild, { targetName, bundleIdentifier, groupIdentifier }],
  ]

  return withPlugins(config, plugins)
}
