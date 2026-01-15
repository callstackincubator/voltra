import type { AndroidWidgetConfig } from '../types'

/**
 * Validates an Android widget configuration.
 * Throws an error if validation fails.
 */
export function validateAndroidWidgetConfig(widget: AndroidWidgetConfig): void {
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
}
