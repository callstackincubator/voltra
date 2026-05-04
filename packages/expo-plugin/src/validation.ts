import * as fs from 'fs'
import * as path from 'path'

import type {
  AndroidWidgetConfig,
  ConfigPluginProps,
  WidgetConfig,
  WidgetFamily,
  WidgetInitialStatePath,
} from './types'

/**
 * Validation functions for the Voltra plugin
 */

/** Widget id: Swift / Kotlin identifier fragment and Android XML token fragment */
const WIDGET_ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Locale keys in app.json become iOS `.lproj` folder names and Android `values-*` qualifiers (after mapping).
 * Restrict to safe, BCP-47-like tags: no slashes, spaces, or exotic punctuation.
 */
const LOCALE_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*([_-][a-zA-Z0-9]+)*$/

const MAX_LOCALE_KEY_LENGTH = 32

function validateHomeScreenWidgetId(widgetId: unknown): asserts widgetId is string {
  if (!widgetId || typeof widgetId !== 'string') {
    throw new Error('Widget ID is required and must be a string')
  }

  if (!WIDGET_ID_PATTERN.test(widgetId)) {
    throw new Error(
      `Widget ID '${widgetId}' is invalid. ` +
        'Must start with a letter or underscore and contain only alphanumeric characters and underscores.'
    )
  }
}

function assertValidLocaleKey(localeKey: string, widgetId: string, fieldName: string): void {
  if (localeKey.trim() !== localeKey) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} locale key '${localeKey}' must not have leading or trailing whitespace`
    )
  }

  if (!localeKey) {
    throw new Error(`Widget '${widgetId}': ${fieldName} locale map contains an empty locale key`)
  }

  if (localeKey.length > MAX_LOCALE_KEY_LENGTH) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} locale key '${localeKey}' exceeds ${MAX_LOCALE_KEY_LENGTH} characters`
    )
  }

  if (!LOCALE_KEY_PATTERN.test(localeKey)) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} locale key '${localeKey}' is invalid. ` +
        'Use BCP-47-style tags (e.g. en, pl, pt-BR, zh-Hans). Letters, digits, single separators _ or - only.'
    )
  }
}

function validateWidgetLabel(value: unknown, widgetId: string, fieldName: string): void {
  if (typeof value === 'string') {
    if (!value.trim()) {
      throw new Error(`Widget '${widgetId}': ${fieldName} is required`)
    }
    return
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} must be a string or a locale map (e.g. { "en": "...", "pl": "..." })`
    )
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    throw new Error(`Widget '${widgetId}': ${fieldName} locale map must not be empty`)
  }

  const localeKeys = new Set<string>()
  for (const [locale, v] of entries) {
    assertValidLocaleKey(locale, widgetId, fieldName)

    const normalized = locale.toLowerCase().replace(/_/g, '-')
    if (localeKeys.has(normalized)) {
      throw new Error(
        `Widget '${widgetId}': ${fieldName} duplicates locale '${locale}' (underscore and hyphen forms count as the same, e.g. pt_BR vs pt-BR)`
      )
    }
    localeKeys.add(normalized)

    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`Widget '${widgetId}': ${fieldName}.${locale} must be a non-empty string`)
    }
  }
}

/**
 * Validates optional initialStatePath: plain string or locale map of project-relative file paths.
 */
export function validateInitialStatePath(
  value: WidgetInitialStatePath | undefined,
  widgetId: string,
  projectRoot?: string
): void {
  if (value === undefined) {
    return
  }

  const assertPathExists = (relativePath: string, ctx: string) => {
    if (!relativePath.trim()) {
      throw new Error(`Widget '${widgetId}': initialStatePath ${ctx} must be a non-empty path`)
    }
    if (projectRoot) {
      const fullPath = path.join(projectRoot, relativePath)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Widget '${widgetId}': initialStatePath file not found at ${relativePath}`)
      }
    }
  }

  if (typeof value === 'string') {
    assertPathExists(value, '')
    return
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      `Widget '${widgetId}': initialStatePath must be a string or a locale map of paths (e.g. { "en": "./widgets/en.tsx", "pl": "./widgets/pl.tsx" })`
    )
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    throw new Error(`Widget '${widgetId}': initialStatePath locale map must not be empty`)
  }

  const localeKeys = new Set<string>()
  for (const [locale, v] of entries) {
    assertValidLocaleKey(locale, widgetId, 'initialStatePath')

    const normalized = locale.toLowerCase().replace(/_/g, '-')
    if (localeKeys.has(normalized)) {
      throw new Error(
        `Widget '${widgetId}': initialStatePath duplicates locale '${locale}' (underscore and hyphen forms count as the same)`
      )
    }
    localeKeys.add(normalized)

    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`Widget '${widgetId}': initialStatePath.${locale} must be a non-empty path string`)
    }
    assertPathExists(v, `.${locale}`)
  }
}

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
  validateHomeScreenWidgetId(widget.id)

  validateWidgetLabel(widget.displayName, widget.id, 'displayName')
  validateWidgetLabel(widget.description, widget.id, 'description')
  /** File existence is checked when `projectRoot` is available (e.g. Android prebuild). */
  validateInitialStatePath(widget.initialStatePath, widget.id)

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
  validateHomeScreenWidgetId(widget.id)

  validateWidgetLabel(widget.displayName, widget.id, 'displayName')
  validateWidgetLabel(widget.description, widget.id, 'description')
  validateInitialStatePath(widget.initialStatePath, widget.id, projectRoot)

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

    if (props.android.enableNotifications !== undefined && typeof props.android.enableNotifications !== 'boolean') {
      throw new Error('android.enableNotifications must be a boolean')
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
