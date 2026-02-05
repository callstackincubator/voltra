import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../types'

export interface GenerateKotlinFilesProps {
  platformProjectRoot: string
  packageName: string
  widgets: AndroidWidgetConfig[]
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates Kotlin receiver classes for all configured widgets
 */
export async function generateWidgetReceivers(props: GenerateKotlinFilesProps): Promise<void> {
  const { platformProjectRoot, packageName, widgets } = props

  // Determine the package path (e.g., com.example.app -> com/example/app)
  const packagePath = packageName.replace(/\./g, '/')
  const widgetDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'java', packagePath, 'widget')

  // Ensure the widget directory exists
  if (!fs.existsSync(widgetDir)) {
    fs.mkdirSync(widgetDir, { recursive: true })
  }

  // Generate a receiver class for each widget
  for (const widget of widgets) {
    const className = `VoltraWidget_${widget.id}Receiver`
    const filePath = path.join(widgetDir, `${className}.kt`)
    const content = generateWidgetReceiverClass(widget, packageName)

    fs.writeFileSync(filePath, content, 'utf8')
  }
}

// ============================================================================
// Widget Receiver
// ============================================================================

/**
 * Generates Kotlin code for a single widget receiver class
 */
function generateWidgetReceiverClass(widget: AndroidWidgetConfig, packageName: string): string {
  // Sanitize the widget id for use as a Kotlin class name
  const className = `VoltraWidget_${widget.id}Receiver`

  return dedent`
    package ${packageName}.widget

    import voltra.widget.VoltraWidgetReceiver

    /**
     * Auto-generated widget receiver for ${widget.displayName}
     * Widget ID: ${widget.id}
     */
    class ${className} : VoltraWidgetReceiver() {
        override val widgetId: String = "${widget.id}"
    }
  `
}
