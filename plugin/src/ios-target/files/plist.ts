import * as fs from 'fs'
import * as path from 'path'

import { logger } from '../../../utils'

/**
 * Generates the Info.plist content for a WidgetKit extension.
 *
 * This is the minimal required Info.plist - it only declares the extension point.
 * Build settings (GENERATE_INFOPLIST_FILE=YES) handles the rest.
 */
function generateInfoPlistContent(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
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
 */
export function generateInfoPlist(targetPath: string): void {
  const infoPlistPath = path.join(targetPath, 'Info.plist')
  fs.writeFileSync(infoPlistPath, generateInfoPlistContent())
  logger.info('Generated Info.plist')
}
