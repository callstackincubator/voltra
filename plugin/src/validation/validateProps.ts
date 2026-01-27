import type { ConfigPluginProps } from '../types'
import { validateAndroidWidgetConfig } from './validateAndroidWidget'
import { validateWidgetConfig } from './validateWidget'

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
