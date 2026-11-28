import {
  validateHomeScreenWidgetId,
  validateInitialStatePath,
  validateWidgetConfigurationCopy,
  validateWidgetEntry,
  validateWidgetLabel,
  validateWidgetServerUpdate,
} from '@use-voltra/expo-plugin'

import { iosServerUpdateRules } from './ios/serverUpdate'
import { getDynamicLiveActivityAttributesType } from '@use-voltra/expo-plugin'

import { widgetKind } from './constants'
import type {
  AppIntentParameter,
  IOSConfigPluginProps,
  IOSDynamicLiveActivityConfig,
  IOSWidgetConfig,
  IOSWidgetFamily,
} from './types'

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
  if (widget.kind !== undefined && (typeof widget.kind !== 'string' || widget.kind.trim() === '')) {
    throw new Error(`Widget '${widget.id}': kind must be a non-empty string`)
  }
  validateWidgetLabel(widget.displayName, widget.id, 'displayName')
  validateWidgetLabel(widget.description, widget.id, 'description')
  validateInitialStatePath(widget.initialStatePath, widget.id, projectRoot)

  if (widget.entry !== undefined) {
    validateWidgetEntry(widget.entry, widget.id, projectRoot)
  }

  validateWidgetServerUpdate(widget.serverUpdate, widget.id, iosServerUpdateRules(widget))
  validateWidgetConfigurationCopy(widget, { requireParameterTitle: true })

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

/** What a widget's intent declares; widgets that share an intent must declare the same. */
function parameterShape(parameter: AppIntentParameter) {
  const kind = parameter.dynamicOptions ? 'dynamicOptions' : parameter.options?.length ? 'options' : 'plain'
  return [parameter.name, kind, parameter.options?.map((option) => option.value), parameter.entityName]
}

/**
 * Widgets share an intent or entity by naming it the same, and the Swift generator emits each name
 * once, from the first widget that uses it (`claimSwiftType`). So a name has to mean one type: a
 * shared intent the same parameters, a shared entity the same parameter name, and no name two kinds
 * of type.
 */
function validateSharedSwiftTypeNames(widgets: IOSWidgetConfig[]): void {
  const intents = new Map<string, { widgetId: string; shape: string }>()
  const entities = new Map<string, { widgetId: string; parameter: string }>()

  for (const widget of widgets) {
    const { intentName, parameters = [] } = widget.appIntent ?? {}
    if (intentName !== undefined) {
      const first = intents.get(intentName)
      const shape = JSON.stringify(parameters.map(parameterShape))
      if (first && first.shape !== shape) {
        throw new Error(
          `Widgets '${first.widgetId}' and '${widget.id}' share appIntent.intentName '${intentName}', so they must declare the same parameters (name, options or dynamicOptions, option values and entityName)`
        )
      }
      // Without an entityName each widget would name its own entity, while the shared intent uses the first one's.
      const unnamed = parameters.find((parameter) => parameter.dynamicOptions && parameter.entityName === undefined)
      if (first && unnamed) {
        throw new Error(
          `Widgets '${first.widgetId}' and '${widget.id}' share appIntent.intentName '${intentName}', so dynamicOptions parameter '${unnamed.name}' needs an entityName`
        )
      }
      if (!first) {
        intents.set(intentName, { widgetId: widget.id, shape })
      }
    }

    const widgetEntities = new Set<string>()
    for (const parameter of parameters) {
      const { entityName } = parameter
      if (entityName === undefined) {
        continue
      }
      if (widgetEntities.has(entityName)) {
        throw new Error(`Widget '${widget.id}': two appIntent parameters use entityName '${entityName}'`)
      }
      widgetEntities.add(entityName)

      const first = entities.get(entityName)
      if (first && first.parameter !== parameter.name) {
        throw new Error(
          `Widgets '${first.widgetId}' and '${widget.id}' share entityName '${entityName}', so the parameter must have the same name, but they name it '${first.parameter}' and '${parameter.name}'`
        )
      }
      if (!first) {
        entities.set(entityName, { widgetId: widget.id, parameter: parameter.name })
      }
    }
  }

  for (const entityName of entities.keys()) {
    const query = `${entityName}Query`
    if (intents.has(entityName) || intents.has(query) || entities.has(query)) {
      throw new Error(
        `entityName '${entityName}' generates the types '${entityName}' and '${query}', and another intentName or entityName uses one of them`
      )
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
    const seenKinds = new Set<string>()
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

      const kind = widgetKind(widget)
      if (seenKinds.has(kind)) {
        throw new Error(`Duplicate widget kind: '${kind}'`)
      }
      seenKinds.add(kind)
    }

    validateSharedSwiftTypeNames(props.widgets)
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
