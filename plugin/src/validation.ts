import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig, ConfigPluginProps, WidgetConfig, WidgetFamily } from './types'

/**
 * Validation functions for the Voltra plugin
 */

// ============================================================================
// iOS Widget Validation
// ============================================================================

const VALID_FAMILIES: Set<WidgetFamily> = new Set([
  'systemSmall',
  'systemMedium',
  'systemLarge',
  'systemExtraLarge',
  'accessoryCircular',
  'accessoryRectangular',
  'accessoryInline',
])

/**
 * Validates a widget configuration.
 * Throws an error if validation fails.
 */
export function validateWidgetConfig(widget: WidgetConfig): void {
  // Validate widget ID
  if (!widget.id || typeof widget.id !== 'string') {
    throw new Error('Widget ID is required and must be a string')
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(widget.id)) {
    throw new Error(
      `Widget ID '${widget.id}' is invalid. ` +
        'Must start with a letter or underscore and contain only alphanumeric characters and underscores.'
    )
  }

  // Validate display name
  if (!widget.displayName?.trim()) {
    throw new Error(`Widget '${widget.id}': displayName is required`)
  }

  // Validate description
  if (!widget.description?.trim()) {
    throw new Error(`Widget '${widget.id}': description is required`)
  }

  // Validate supported families if provided
  if (widget.supportedFamilies) {
    if (!Array.isArray(widget.supportedFamilies)) {
      throw new Error(`Widget '${widget.id}': supportedFamilies must be an array`)
    }

    for (const family of widget.supportedFamilies) {
      if (!VALID_FAMILIES.has(family)) {
        throw new Error(
          `Widget '${widget.id}': Invalid widget family '${family}'. ` +
            `Valid families are: ${Array.from(VALID_FAMILIES).join(', ')}`
        )
      }
    }
  }
}

// ============================================================================
// Android Widget Validation
// ============================================================================

/**
 * Validates an Android widget configuration.
 * Throws an error if validation fails.
 */
export function validateAndroidWidgetConfig(widget: AndroidWidgetConfig, projectRoot?: string): void {
  // Validate widget ID
  if (!widget.id || typeof widget.id !== 'string') {
    throw new Error('Widget ID is required and must be a string')
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(widget.id)) {
    throw new Error(
      `Widget ID '${widget.id}' is invalid. ` +
        'Must start with a letter or underscore and contain only alphanumeric characters and underscores.'
    )
  }

  // Validate display name
  if (!widget.displayName?.trim()) {
    throw new Error(`Widget '${widget.id}': displayName is required`)
  }

  // Validate description
  if (!widget.description?.trim()) {
    throw new Error(`Widget '${widget.id}': description is required`)
  }

  // Validate targetCellWidth
  if (typeof widget.targetCellWidth !== 'number') {
    throw new Error(`Widget '${widget.id}': targetCellWidth is required and must be a number`)
  }
  if (!Number.isInteger(widget.targetCellWidth) || widget.targetCellWidth < 1) {
    throw new Error(`Widget '${widget.id}': targetCellWidth must be a positive integer (typically 1-5)`)
  }

  // Validate targetCellHeight
  if (typeof widget.targetCellHeight !== 'number') {
    throw new Error(`Widget '${widget.id}': targetCellHeight is required and must be a number`)
  }
  if (!Number.isInteger(widget.targetCellHeight) || widget.targetCellHeight < 1) {
    throw new Error(`Widget '${widget.id}': targetCellHeight must be a positive integer (typically 1-5)`)
  }

  // Validate minCellWidth if provided
  if (widget.minCellWidth !== undefined) {
    if (typeof widget.minCellWidth !== 'number' || !Number.isInteger(widget.minCellWidth) || widget.minCellWidth < 1) {
      throw new Error(`Widget '${widget.id}': minCellWidth must be a positive integer`)
    }
  }

  // Validate minCellHeight if provided
  if (widget.minCellHeight !== undefined) {
    if (
      typeof widget.minCellHeight !== 'number' ||
      !Number.isInteger(widget.minCellHeight) ||
      widget.minCellHeight < 1
    ) {
      throw new Error(`Widget '${widget.id}': minCellHeight must be a positive integer`)
    }
  }

  // Validate previewImage if provided
  if (widget.previewImage !== undefined) {
    if (typeof widget.previewImage !== 'string' || !widget.previewImage.trim()) {
      throw new Error(`Widget '${widget.id}': previewImage must be a non-empty string`)
    }

    const ext = path.extname(widget.previewImage).toLowerCase()
    const validImageExts = ['.png', '.jpg', '.jpeg', '.webp']
    if (!validImageExts.includes(ext)) {
      throw new Error(`Widget '${widget.id}': previewImage must be a PNG, JPG, JPEG, or WebP file. Got: ${ext}`)
    }

    // Check file exists if projectRoot is provided
    if (projectRoot) {
      const fullPath = path.join(projectRoot, widget.previewImage)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Widget '${widget.id}': previewImage file not found at ${widget.previewImage}`)
      }
    }
  }

  // Validate previewLayout if provided
  if (widget.previewLayout !== undefined) {
    if (typeof widget.previewLayout !== 'string' || !widget.previewLayout.trim()) {
      throw new Error(`Widget '${widget.id}': previewLayout must be a non-empty string`)
    }

    const ext = path.extname(widget.previewLayout).toLowerCase()
    if (ext !== '.xml') {
      throw new Error(`Widget '${widget.id}': previewLayout must be an XML file. Got: ${ext}`)
    }

    // Check file exists if projectRoot is provided
    if (projectRoot) {
      const fullPath = path.join(projectRoot, widget.previewLayout)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Widget '${widget.id}': previewLayout file not found at ${widget.previewLayout}`)
      }
    }
  }
}

// ============================================================================
// Plugin Props Validation
// ============================================================================

/**
 * Validates the plugin props at entry point.
 * Throws an error if validation fails.
 */
export function validateProps(props: ConfigPluginProps): void {
  // Validate group identifier format if provided
  if (props.groupIdentifier !== undefined) {
    if (typeof props.groupIdentifier !== 'string') {
      throw new Error('groupIdentifier must be a string')
    }

    if (!props.groupIdentifier.startsWith('group.')) {
      throw new Error(`groupIdentifier '${props.groupIdentifier}' must start with 'group.'`)
    }
  }

  // Validate iOS widgets if provided
  if (props.widgets !== undefined) {
    if (!Array.isArray(props.widgets)) {
      throw new Error('widgets must be an array')
    }

    // Check for duplicate widget IDs
    const seenIds = new Set<string>()
    for (const widget of props.widgets) {
      validateWidgetConfig(widget)

      if (seenIds.has(widget.id)) {
        throw new Error(`Duplicate widget ID: '${widget.id}'`)
      }
      seenIds.add(widget.id)
    }
  }

  // Validate Android configuration if provided
  if (props.android !== undefined) {
    if (typeof props.android !== 'object' || props.android === null) {
      throw new Error('android configuration must be an object')
    }

    if (props.android.widgets !== undefined) {
      if (!Array.isArray(props.android.widgets)) {
        throw new Error('android.widgets must be an array')
      }

      // Check for duplicate widget IDs
      const seenIds = new Set<string>()
      for (const widget of props.android.widgets) {
        validateAndroidWidgetConfig(widget)

        if (seenIds.has(widget.id)) {
          throw new Error(`Duplicate Android widget ID: '${widget.id}'`)
        }
        seenIds.add(widget.id)
      }
    }
  }
}
