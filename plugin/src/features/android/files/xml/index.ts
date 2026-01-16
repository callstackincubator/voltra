import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../../../types'
import { generatePlaceholderLayoutXml } from './placeholderLayout'
import { generateStringResourcesXml } from './stringResources'
import { generateWidgetInfoXml } from './widgetInfo'

export interface GenerateXmlFilesProps {
  platformProjectRoot: string
  widgets: AndroidWidgetConfig[]
}

/**
 * Generates all XML files for Android widgets
 */
export async function generateXmlFiles(props: GenerateXmlFilesProps): Promise<void> {
  const { platformProjectRoot, widgets } = props

  const resPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res')
  const xmlPath = path.join(resPath, 'xml')
  const layoutPath = path.join(resPath, 'layout')
  const valuesPath = path.join(resPath, 'values')

  // Ensure directories exist
  for (const dir of [xmlPath, layoutPath, valuesPath]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // Generate widget info XML for each widget
  for (const widget of widgets) {
    const widgetInfoPath = path.join(xmlPath, `voltra_widget_${widget.id}_info.xml`)
    const widgetInfoContent = generateWidgetInfoXml(widget)
    fs.writeFileSync(widgetInfoPath, widgetInfoContent, 'utf8')
  }

  // Generate placeholder layout (shared by all widgets)
  const placeholderLayoutPath = path.join(layoutPath, 'voltra_widget_placeholder.xml')
  const placeholderLayoutContent = generatePlaceholderLayoutXml()
  fs.writeFileSync(placeholderLayoutPath, placeholderLayoutContent, 'utf8')

  // Generate string resources for all widgets
  const stringsPath = path.join(valuesPath, 'voltra_widgets.xml')
  const stringsContent = generateStringResourcesXml(widgets)
  fs.writeFileSync(stringsPath, stringsContent, 'utf8')
}
