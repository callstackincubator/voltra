import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../../../types'
import { logger } from '../../../../utils'
import { checkImageSize } from './images'

/**
 * Copies preview images to Android drawable resources.
 * Returns a map of widgetId to drawable resource name.
 */
export async function copyPreviewImagesToAndroid(
  widgets: AndroidWidgetConfig[],
  projectRoot: string,
  drawablePath: string
): Promise<Map<string, string>> {
  const previewImageMap = new Map<string, string>()

  // Ensure drawable directory exists
  if (!fs.existsSync(drawablePath)) {
    fs.mkdirSync(drawablePath, { recursive: true })
  }

  for (const widget of widgets) {
    if (!widget.previewImage) {
      continue
    }

    const sourcePath = path.join(projectRoot, widget.previewImage)

    // Validate file exists
    if (!fs.existsSync(sourcePath)) {
      logger.warn(`Preview image not found for widget '${widget.id}' at ${widget.previewImage}`)
      continue
    }

    // Check image size
    checkImageSize(sourcePath)

    // Generate drawable resource name
    const ext = path.extname(widget.previewImage).toLowerCase()
    const drawableName = `voltra_widget_${widget.id}_preview`
    const destinationPath = path.join(drawablePath, `${drawableName}${ext}`)

    // Copy file
    fs.copyFileSync(sourcePath, destinationPath)
    logger.info(`Copied preview image for widget '${widget.id}' to ${drawableName}${ext}`)

    previewImageMap.set(widget.id, drawableName)
  }

  return previewImageMap
}
