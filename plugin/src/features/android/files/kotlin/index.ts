import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../../../types'
import { generateWidgetReceiverClass } from './widgetReceiver'

export interface GenerateKotlinFilesProps {
  platformProjectRoot: string
  packageName: string
  widgets: AndroidWidgetConfig[]
}

/**
 * Generates Kotlin receiver classes for all configured widgets
 */
export async function generateKotlinFiles(props: GenerateKotlinFilesProps): Promise<void> {
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
