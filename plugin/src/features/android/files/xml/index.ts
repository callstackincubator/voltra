import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../../../types'
import { generatePlaceholderLayoutXml } from './placeholderLayout'
import { generatePreviewLayouts } from './previewLayout'
import { generateStringResourcesXml } from './stringResources'
import { generateWidgetInfoXml } from './widgetInfo'

export interface GenerateXmlFilesProps {
  platformProjectRoot: string
  projectRoot: string
  widgets: AndroidWidgetConfig[]
  previewImageMap: Map<string, string>
}

/**
 * Generates all XML files for Android widgets
 */
export async function generateXmlFiles(props: GenerateXmlFilesProps): Promise<void> {
  const { platformProjectRoot, projectRoot, widgets, previewImageMap } = props

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

  // Generate preview layouts
  const previewLayoutMap = await generatePreviewLayouts(widgets, projectRoot, layoutPath, previewImageMap)

  // Generate widget info XML for each widget
  for (const widget of widgets) {
    const widgetInfoPath = path.join(xmlPath, `voltra_widget_${widget.id}_info.xml`)
    const previewImageResourceName = previewImageMap.get(widget.id)
    const previewLayoutResourceName = previewLayoutMap.get(widget.id)
    const widgetInfoContent = generateWidgetInfoXml(widget, previewImageResourceName, previewLayoutResourceName)
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
