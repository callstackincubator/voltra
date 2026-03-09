import * as fs from 'fs'
import * as path from 'path'

import { logger } from '../../utils/logger'

/**
 * Generates the Info.plist content for a WidgetKit extension.
 *
 * This includes version information and the required WidgetKit extension point.
 * Version keys are written directly to the plist following the Expo pattern.
 */
function generateInfoPlistContent(targetName: string, version: string, buildNumber: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>${targetName}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>${version}</string>
	<key>CFBundleVersion</key>
	<string>${buildNumber}</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>
`
}

/**
 * Generates the Info.plist file for the widget extension.
 *
 * @param targetPath - Path to the widget extension target directory
 * @param targetName - The widget extension target name (used for CFBundleDisplayName)
 * @param version - The app version (CFBundleShortVersionString)
 * @param buildNumber - The build number (CFBundleVersion)
 */
export function generateInfoPlist(targetPath: string, targetName: string, version: string, buildNumber: string): void {
  const infoPlistPath = path.join(targetPath, 'Info.plist')
  fs.writeFileSync(infoPlistPath, generateInfoPlistContent(targetName, version, buildNumber))
  logger.info('Generated Info.plist')
}
