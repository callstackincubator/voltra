import {
  validateHomeScreenWidgetId,
  validateInitialStatePath,
  validateWidgetEntry,
  validateWidgetLabel,
  validateWidgetServerUpdate,
} from '@use-voltra/expo-plugin'

import { iosServerUpdateRules } from './ios/serverUpdate'
import { getDynamicLiveActivityAttributesType } from '@use-voltra/expo-plugin'

import type { IOSConfigPluginProps, IOSDynamicLiveActivityConfig, IOSWidgetConfig, IOSWidgetFamily } from './types'

const VALID_FAMILIES: Set<IOSWidgetFamily> = new Set([
  'systemSmall',
  'systemMedium',
  'systemLarge',
  'systemExtraLarge',
  'accessoryCircular',
  'accessoryRectangular',
  'accessoryInline',
])
const DYNAMIC_LIVE_ACTIVITY_ID_PATTERN = /^[a-zA-Z0-9_]+$/

export function validateIOSDynamicLiveActivityConfig(
  liveActivity: IOSDynamicLiveActivityConfig,
  projectRoot?: string
): void {
  if (!liveActivity.id || typeof liveActivity.id !== 'string') {
    throw new Error('Dynamic Live Activity ID is required and must be a string')
  }

  if (!DYNAMIC_LIVE_ACTIVITY_ID_PATTERN.test(liveActivity.id)) {
    throw new Error(
      `Dynamic Live Activity ID '${liveActivity.id}' is invalid. ` +
        'It must be non-empty and contain only alphanumeric characters and underscores.'
    )
  }

  validateWidgetEntry(liveActivity.entry, liveActivity.id, projectRoot)
}

export function validateIOSWidgetConfig(widget: IOSWidgetConfig, projectRoot?: string): void {
  validateHomeScreenWidgetId(widget.id)
  validateWidgetLabel(widget.displayName, widget.id, 'displayName')
  validateWidgetLabel(widget.description, widget.id, 'description')
  validateInitialStatePath(widget.initialStatePath, widget.id, projectRoot)

  if (widget.entry !== undefined) {
    validateWidgetEntry(widget.entry, widget.id, projectRoot)
  }

  validateWidgetServerUpdate(widget.serverUpdate, widget.id, iosServerUpdateRules(widget))

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

export function validateIOSConfigPluginProps(props: IOSConfigPluginProps, projectRoot?: string): void {
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
      validateIOSWidgetConfig(widget, projectRoot)

      // A server-driven Dynamic Widget commits fetched props to the App Group so the widget
      // extension can read them. Without one it would fetch and have nowhere to put the result.
      if (widget.entry !== undefined && widget.serverUpdate !== undefined && !props.groupIdentifier) {
        throw new Error(
          `Widget '${widget.id}' has both entry and serverUpdate, which requires groupIdentifier ` +
            'so fetched props can be shared with the widget extension.'
        )
      }

      if (seenIds.has(widget.id)) {
        throw new Error(`Duplicate widget ID: '${widget.id}'`)
      }
      seenIds.add(widget.id)
    }
  }

  if (props.liveActivities !== undefined) {
    if (!Array.isArray(props.liveActivities)) {
      throw new Error('liveActivities must be an array')
    }

    if (props.liveActivities.length > 0 && !props.groupIdentifier) {
      throw new Error('groupIdentifier is required when liveActivities is non-empty')
    }

    const seenIds = new Set<string>()
    const seenAttributesTypes = new Map<string, string>()
    for (const liveActivity of props.liveActivities) {
      validateIOSDynamicLiveActivityConfig(liveActivity, projectRoot)

      if (seenIds.has(liveActivity.id)) {
        throw new Error(`Duplicate Dynamic Live Activity ID: '${liveActivity.id}'`)
      }
      seenIds.add(liveActivity.id)

      const attributesType = getDynamicLiveActivityAttributesType(liveActivity.id)
      const conflictingId = seenAttributesTypes.get(attributesType)
      if (conflictingId) {
        throw new Error(
          `Dynamic Live Activity IDs '${conflictingId}' and '${liveActivity.id}' generate the same ActivityKit attributes type '${attributesType}'`
        )
      }
      seenAttributesTypes.set(attributesType, liveActivity.id)
    }
  }
}
