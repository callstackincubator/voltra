import * as fs from 'fs'
import * as path from 'path'

import {
  validateHomeScreenWidgetId,
  validateInitialStatePath,
  validateWidgetEntry,
  validateWidgetLabel,
  validateWidgetServerUpdate,
} from '@use-voltra/expo-plugin'

import { androidServerUpdateRules } from './android/serverUpdate'

import type { AndroidConfigPluginProps, AndroidWidgetConfig } from './types'

function validatePositiveIntegerField(widget: AndroidWidgetConfig, field: keyof AndroidWidgetConfig): void {
  const value = widget[field]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`Widget '${widget.id}': ${field} must be a positive integer`)
  }
}

export function validateAndroidWidgetConfig(widget: AndroidWidgetConfig, projectRoot?: string): void {
  validateHomeScreenWidgetId(widget.id)
  validateWidgetLabel(widget.displayName, widget.id, 'displayName')
  validateWidgetLabel(widget.description, widget.id, 'description')
  validateInitialStatePath(widget.initialStatePath, widget.id, projectRoot)

  if (widget.entry !== undefined) {
    validateWidgetEntry(widget.entry, widget.id, projectRoot)
  }

  validateWidgetServerUpdate(widget.serverUpdate, widget.id, androidServerUpdateRules(widget))

  if (typeof widget.targetCellWidth !== 'number') {
    throw new Error(`Widget '${widget.id}': targetCellWidth is required and must be a number`)
  }
  if (!Number.isInteger(widget.targetCellWidth) || widget.targetCellWidth < 1) {
    throw new Error(`Widget '${widget.id}': targetCellWidth must be a positive integer (typically 1-5)`)
  }

  if (typeof widget.targetCellHeight !== 'number') {
    throw new Error(`Widget '${widget.id}': targetCellHeight is required and must be a number`)
  }
  if (!Number.isInteger(widget.targetCellHeight) || widget.targetCellHeight < 1) {
    throw new Error(`Widget '${widget.id}': targetCellHeight must be a positive integer (typically 1-5)`)
  }

  if (widget.minWidth !== undefined) {
    validatePositiveIntegerField(widget, 'minWidth')
  }

  if (widget.minHeight !== undefined) {
    validatePositiveIntegerField(widget, 'minHeight')
  }

  if (widget.minCellWidth !== undefined) {
    validatePositiveIntegerField(widget, 'minCellWidth')
  }

  if (widget.minCellHeight !== undefined) {
    validatePositiveIntegerField(widget, 'minCellHeight')
  }

  if (widget.minResizeWidth !== undefined) {
    validatePositiveIntegerField(widget, 'minResizeWidth')
  }

  if (widget.minResizeHeight !== undefined) {
    validatePositiveIntegerField(widget, 'minResizeHeight')
  }

  if (widget.maxResizeWidth !== undefined) {
    validatePositiveIntegerField(widget, 'maxResizeWidth')
  }

  if (widget.maxResizeHeight !== undefined) {
    validatePositiveIntegerField(widget, 'maxResizeHeight')
  }

  if (widget.previewImage !== undefined) {
    if (typeof widget.previewImage !== 'string' || !widget.previewImage.trim()) {
      throw new Error(`Widget '${widget.id}': previewImage must be a non-empty string`)
    }

    const ext = path.extname(widget.previewImage).toLowerCase()
    const validImageExts = ['.png', '.jpg', '.jpeg', '.webp']
    if (!validImageExts.includes(ext)) {
      throw new Error(`Widget '${widget.id}': previewImage must be a PNG, JPG, JPEG, or WebP file. Got: ${ext}`)
    }

    if (projectRoot) {
      const fullPath = path.join(projectRoot, widget.previewImage)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Widget '${widget.id}': previewImage file not found at ${widget.previewImage}`)
      }
    }
  }

  if (widget.previewLayout !== undefined) {
    if (typeof widget.previewLayout !== 'string' || !widget.previewLayout.trim()) {
      throw new Error(`Widget '${widget.id}': previewLayout must be a non-empty string`)
    }

    const ext = path.extname(widget.previewLayout).toLowerCase()
    if (ext !== '.xml') {
      throw new Error(`Widget '${widget.id}': previewLayout must be an XML file. Got: ${ext}`)
    }

    if (projectRoot) {
      const fullPath = path.join(projectRoot, widget.previewLayout)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Widget '${widget.id}': previewLayout file not found at ${widget.previewLayout}`)
      }
    }
  }
}

export function validateAndroidConfigPluginProps(props: AndroidConfigPluginProps, projectRoot?: string): void {
  if (props.enableNotifications !== undefined && typeof props.enableNotifications !== 'boolean') {
    throw new Error('enableNotifications must be a boolean')
  }

  if (props.widgets !== undefined) {
    if (!Array.isArray(props.widgets)) {
      throw new Error('widgets must be an array')
    }

    const seenIds = new Set<string>()
    for (const widget of props.widgets) {
      validateAndroidWidgetConfig(widget, projectRoot)

      if (seenIds.has(widget.id)) {
        throw new Error(`Duplicate Android widget ID: '${widget.id}'`)
      }
      seenIds.add(widget.id)
    }
  }
}
