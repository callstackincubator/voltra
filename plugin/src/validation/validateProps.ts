import type { ConfigPluginProps } from '../types'
import { validateLiveActivityConfig } from './validateActivity'
import { validateWidgetConfig } from './validateWidget'

/**
 * Validates the plugin props at entry point.
 * Throws an error if validation fails.
 */
export function validateProps(props: ConfigPluginProps | undefined): void {
  if (!props) {
    throw new Error(
      'Voltra plugin requires configuration. Please provide at least groupIdentifier in your plugin config.'
    )
  }

  // Validate group identifier is provided
  if (!props.groupIdentifier) {
    throw new Error('groupIdentifier is required. Please provide a groupIdentifier in your Voltra plugin config.')
  }

  // Validate group identifier format
  if (typeof props.groupIdentifier !== 'string') {
    throw new Error('groupIdentifier must be a string')
  }

  if (!props.groupIdentifier.startsWith('group.')) {
    throw new Error(`groupIdentifier '${props.groupIdentifier}' must start with 'group.'`)
  }

  // Validate widgets if provided
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

  if (props.liveActivity) {
    validateLiveActivityConfig(props.liveActivity)
  }
}
