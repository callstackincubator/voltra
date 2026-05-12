import {
  validateHomeScreenWidgetId,
  validateInitialStatePath,
  validateWidgetLabel,
} from '@use-voltra/expo-plugin'

import type { IOSConfigPluginProps, IOSWidgetConfig, IOSWidgetFamily } from './types'

const VALID_FAMILIES: Set<IOSWidgetFamily> = new Set([
  'systemSmall',
  'systemMedium',
  'systemLarge',
  'systemExtraLarge',
  'accessoryCircular',
  'accessoryRectangular',
  'accessoryInline',
])

export function validateIOSWidgetConfig(widget: IOSWidgetConfig): void {
  validateHomeScreenWidgetId(widget.id)
  validateWidgetLabel(widget.displayName, widget.id, 'displayName')
  validateWidgetLabel(widget.description, widget.id, 'description')
  validateInitialStatePath(widget.initialStatePath, widget.id)

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

export function validateIOSConfigPluginProps(props: IOSConfigPluginProps): void {
  if (props.groupIdentifier !== undefined) {
    if (typeof props.groupIdentifier !== 'string') {
      throw new Error('groupIdentifier must be a string')
    }

    if (!props.groupIdentifier.startsWith('group.')) {
      throw new Error(`groupIdentifier '${props.groupIdentifier}' must start with 'group.'`)
    }
  }

  if (props.widgets !== undefined) {
    if (!Array.isArray(props.widgets)) {
      throw new Error('widgets must be an array')
    }

    const seenIds = new Set<string>()
    for (const widget of props.widgets) {
      validateIOSWidgetConfig(widget)

      if (seenIds.has(widget.id)) {
        throw new Error(`Duplicate widget ID: '${widget.id}'`)
      }
      seenIds.add(widget.id)
    }
  }
}
