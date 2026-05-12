import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import { isWidgetLocalizedMap, logger, widgetLabelEnglish } from '@use-voltra/expo-plugin'

import type { AndroidWidgetConfig } from '../../types'

export interface GenerateXmlFilesProps {
  platformProjectRoot: string
  projectRoot: string
  widgets: AndroidWidgetConfig[]
  previewImageMap: Map<string, string>
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generates widget info XML files for all widgets
 */
export async function generateWidgetInfoFiles(props: {
  platformProjectRoot: string
  widgets: AndroidWidgetConfig[]
}): Promise<void> {
  const { platformProjectRoot, widgets } = props
  const xmlPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml')
  const mainRes = path.join(platformProjectRoot, 'app', 'src', 'main', 'res')
  const valuesPath = path.join(mainRes, 'values')

  // Ensure directories exist
  if (!fs.existsSync(xmlPath)) {
    fs.mkdirSync(xmlPath, { recursive: true })
  }
  if (!fs.existsSync(valuesPath)) {
    fs.mkdirSync(valuesPath, { recursive: true })
  }

  // Default strings (development / fallback language — prefers English locale entries in locale maps): res/values/voltra_widgets.xml
  const stringsPath = path.join(valuesPath, VOLTRA_WIDGET_STRINGS_FILE)
  fs.writeFileSync(stringsPath, generateVoltraWidgetsStringResourcesXml(widgets, null), 'utf8')

  const localeKeys = collectAndroidLocaleKeysFromWidgets(widgets)
  /** Qualifiers we generated under res/values-<qualifier>/ (Android resource folder suffixes) */
  const generatedQualifiers = new Set<string>()

  for (const localeKey of localeKeys) {
    const qualifier = localeKeyToAndroidValuesQualifier(localeKey)
    if (qualifier === DEFAULT_WIDGET_LOCALE_QUALIFIER) {
      continue
    }
    generatedQualifiers.add(qualifier)
    const localizedValuesDir = path.join(mainRes, `values-${qualifier}`)
    fs.mkdirSync(localizedValuesDir, { recursive: true })
    fs.writeFileSync(
      path.join(localizedValuesDir, VOLTRA_WIDGET_STRINGS_FILE),
      generateVoltraWidgetsStringResourcesXml(widgets, localeKey),
      'utf8'
    )
  }

  cleanupStaleVoltraWidgetLocaleFiles(mainRes, generatedQualifiers)
}

/**
 * Generates placeholder layout XML
 */
export async function generateWidgetPlaceholderLayouts(props: { platformProjectRoot: string }): Promise<void> {
  const layoutPath = path.join(props.platformProjectRoot, 'app', 'src', 'main', 'res', 'layout')

  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true })
  }

  const placeholderLayoutPath = path.join(layoutPath, 'voltra_widget_placeholder.xml')
  const placeholderLayoutContent = generatePlaceholderLayoutXml()
  fs.writeFileSync(placeholderLayoutPath, placeholderLayoutContent, 'utf8')
}

/**
 * Generates preview layouts for widgets
 */
export async function generateWidgetPreviewLayouts(props: GenerateXmlFilesProps): Promise<void> {
  const { platformProjectRoot, projectRoot, widgets, previewImageMap } = props
  const layoutPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'layout')
  const xmlPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml')

  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true })
  }

  // Generate preview layouts and get the map
  const previewLayoutMap = await generatePreviewLayouts(widgets, projectRoot, layoutPath, previewImageMap)

  // Write widget info XML for all widgets, including preview references where available
  for (const widget of widgets) {
    const widgetInfoPath = path.join(xmlPath, `voltra_widget_${widget.id}_info.xml`)
    const previewImageResourceName = previewImageMap.get(widget.id)
    const previewLayoutResourceName = previewLayoutMap.get(widget.id)
    const widgetInfoContent = generateWidgetInfoXml(widget, previewImageResourceName, previewLayoutResourceName)
    fs.writeFileSync(widgetInfoPath, widgetInfoContent, 'utf8')
  }
}

// ============================================================================
// Widget Info XML
// ============================================================================

/**
 * Generates widget provider info XML for a single widget
 */
function generateWidgetInfoXml(
  widget: AndroidWidgetConfig,
  previewImageResourceName?: string,
  previewLayoutResourceName?: string
): string {
  const { targetCellWidth, targetCellHeight } = widget
  const resizeMode = widget.resizeMode || 'horizontal|vertical'
  const widgetCategory = widget.widgetCategory || 'home_screen'

  let minWidth = widget.minWidth
  if (minWidth === undefined && widget.minCellWidth !== undefined) {
    minWidth = widget.minCellWidth * 70 - 30
  }

  let minHeight = widget.minHeight
  if (minHeight === undefined && widget.minCellHeight !== undefined) {
    minHeight = widget.minCellHeight * 70 - 30
  }

  const minWidthAttr = minWidth !== undefined ? `\n    android:minWidth="${minWidth}dp"` : ''
  const minHeightAttr = minHeight !== undefined ? `\n    android:minHeight="${minHeight}dp"` : ''
  const previewImageAttr = previewImageResourceName
    ? `\n    android:previewImage="@drawable/${previewImageResourceName}"`
    : ''
  const previewLayoutAttr = previewLayoutResourceName
    ? `\n    android:previewLayout="@layout/${previewLayoutResourceName}"`
    : ''

  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"${minWidthAttr}${minHeightAttr}
        android:targetCellWidth="${targetCellWidth}"
        android:targetCellHeight="${targetCellHeight}"
        android:updatePeriodMillis="0"
        android:initialLayout="@layout/voltra_widget_placeholder"
        android:resizeMode="${resizeMode}"
        android:widgetCategory="${widgetCategory}"
        android:description="@string/voltra_widget_${widget.id}_description"${previewImageAttr}${previewLayoutAttr}>
    </appwidget-provider>
  `
}

// ============================================================================
// String Resources XML (multilingual: res/values/ + res/values-<locale>/)
// https://stackoverflow.com/questions/47976576/working-with-strings-xml-and-translations
// https://developer.android.com/guide/topics/resources/localization
// ============================================================================

const VOLTRA_WIDGET_STRINGS_FILE = 'voltra_widgets.xml'

/** Locale maps use `en` for the canonical default English locale; unqualified `values/` covers that so skip `values-en/`. */
const DEFAULT_WIDGET_LOCALE_QUALIFIER = 'en'

function isAlpha(value: string): boolean {
  return /^[a-z]+$/i.test(value)
}

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value)
}

function isScriptSubtag(value: string): boolean {
  return value.length === 4 && isAlpha(value)
}

function isRegionSubtag(value: string): boolean {
  return (value.length === 2 && isAlpha(value)) || (value.length === 3 && isNumeric(value))
}

function formatScriptSubtag(value: string): string {
  const lower = value.toLowerCase()
  return `${lower[0]?.toUpperCase() ?? ''}${lower.slice(1)}`
}

/**
 * Maps BCP-style locale keys from app.json to Android resource folder qualifiers.
 * Examples: `pl` → `pl`, `pt-BR` / `pt_BR` → `pt-rBR`, `zh-Hans` → `b+zh+Hans`
 */
function localeKeyToAndroidValuesQualifier(localeKey: string): string {
  const normalized = localeKey.trim().replace(/_/g, '-')
  const segments = normalized.split('-').filter(Boolean)

  const language = segments[0]?.toLowerCase()
  if (!language) {
    return normalized.toLowerCase()
  }

  const rest = segments.slice(1)
  if (rest.length === 0) {
    return language
  }

  const [first, ...tail] = rest
  if (first && isRegionSubtag(first) && tail.length === 0) {
    return `${language}-r${first.toUpperCase()}`
  }

  const bcp47Segments = [language]
  for (const segment of rest) {
    if (isScriptSubtag(segment)) {
      bcp47Segments.push(formatScriptSubtag(segment))
      continue
    }
    if (isRegionSubtag(segment)) {
      bcp47Segments.push(segment.toUpperCase())
      continue
    }
    bcp47Segments.push(segment.toLowerCase())
  }

  return `b+${bcp47Segments.join('+')}`
}

export const __test__ = {
  localeKeyToAndroidValuesQualifier,
}

function collectAndroidLocaleKeysFromWidgets(widgets: AndroidWidgetConfig[]): Set<string> {
  const locales = new Set<string>()
  for (const w of widgets) {
    for (const field of ['displayName', 'description'] as const) {
      const v = w[field]
      if (isWidgetLocalizedMap(v)) {
        for (const [localeKey, text] of Object.entries(v)) {
          if (typeof text === 'string' && text.trim()) {
            locales.add(localeKey)
          }
        }
      }
    }
  }
  return locales
}

function resolveAndroidWidgetLabel(
  widget: AndroidWidgetConfig,
  field: 'displayName' | 'description',
  localeKey: string | null
): string {
  const v = widget[field]
  if (!isWidgetLocalizedMap(v)) {
    return v
  }
  if (localeKey !== null) {
    const localized = v[localeKey]
    if (typeof localized === 'string' && localized.trim()) {
      return localized
    }
  }
  return widgetLabelEnglish(v)
}

function escapeAndroidStringRes(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function generateVoltraWidgetsStringResourcesXml(widgets: AndroidWidgetConfig[], localeKey: string | null): string {
  const localeComment =
    localeKey === null
      ? 'default (values/)'
      : `locale ${localeKey} → values-${localeKeyToAndroidValuesQualifier(localeKey)}`

  const stringEntries = widgets
    .map((widget) => {
      const label = escapeAndroidStringRes(resolveAndroidWidgetLabel(widget, 'displayName', localeKey))
      const desc = escapeAndroidStringRes(resolveAndroidWidgetLabel(widget, 'description', localeKey))
      return `<string name="voltra_widget_${widget.id}_label">${label}</string>\n    <string name="voltra_widget_${widget.id}_description">${desc}</string>`
    })
    .join('\n    ')

  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <resources>
        <!-- Voltra widget picker strings (auto-generated). ${localeComment} -->
        ${stringEntries}
    </resources>
  `
}

/**
 * Removes generated voltra_widgets.xml from values-<qualifier>/ folders we no longer use.
 */
function cleanupStaleVoltraWidgetLocaleFiles(mainRes: string, activeQualifiers: Set<string>): void {
  if (!fs.existsSync(mainRes)) {
    return
  }

  for (const entry of fs.readdirSync(mainRes)) {
    if (!entry.startsWith('values-')) {
      continue
    }

    const qualifier = entry.slice('values-'.length)
    const stringsFile = path.join(mainRes, entry, VOLTRA_WIDGET_STRINGS_FILE)
    if (!fs.existsSync(stringsFile)) {
      continue
    }

    if (activeQualifiers.has(qualifier)) {
      continue
    }

    fs.unlinkSync(stringsFile)
    try {
      const dir = path.join(mainRes, entry)
      if (fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir)
      }
    } catch {
      /* ignore */
    }
  }
}

// ============================================================================
// Placeholder Layout XML
// ============================================================================

/**
 * Generates placeholder layout XML for widgets
 * This will be replaced by Glance at runtime
 */
function generatePlaceholderLayoutXml(): string {
  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="?android:attr/colorBackground">
        <ProgressBar
            style="?android:attr/progressBarStyle"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:indeterminate="true" />
    </FrameLayout>
  `
}

// ============================================================================
// Preview Layout
// ============================================================================

/**
 * Generates an auto-layout XML for image-based preview.
 * This is used when previewImage is provided but no custom previewLayout.
 */
function generateAutoImagePreviewLayout(widgetId: string, drawableResourceName: string): string {
  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
        android:layout_width="match_parent"
        android:layout_height="match_parent">
        <ImageView
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:src="@drawable/${drawableResourceName}"
            android:scaleType="centerCrop"
            android:contentDescription="@string/voltra_widget_${widgetId}_description" />
    </FrameLayout>
  `
}

/**
 * Generates preview layout XML files for all widgets.
 * Returns a map of widgetId to layout resource name.
 *
 * Strategy:
 * - If previewLayout is provided: copy user's custom XML
 * - Else if previewImage is provided: generate auto-layout with ImageView
 * - Otherwise: no preview layout generated
 */
async function generatePreviewLayouts(
  widgets: AndroidWidgetConfig[],
  projectRoot: string,
  layoutPath: string,
  previewImageMap: Map<string, string>
): Promise<Map<string, string>> {
  const previewLayoutMap = new Map<string, string>()

  // Ensure layout directory exists
  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true })
  }

  for (const widget of widgets) {
    let layoutContent: string | null = null
    const layoutResourceName = `voltra_widget_${widget.id}_preview`
    const layoutFilePath = path.join(layoutPath, `${layoutResourceName}.xml`)

    // Strategy 1: User provided custom preview layout
    if (widget.previewLayout) {
      const sourcePath = path.join(projectRoot, widget.previewLayout)

      if (!fs.existsSync(sourcePath)) {
        logger.warn(`Preview layout not found for widget '${widget.id}' at ${widget.previewLayout}`)
        continue
      }

      // Copy user's custom XML
      layoutContent = fs.readFileSync(sourcePath, 'utf8')
      logger.info(`Using custom preview layout for widget '${widget.id}'`)
    }
    // Strategy 2: Auto-generate layout from preview image
    else if (widget.previewImage && previewImageMap.has(widget.id)) {
      const drawableResourceName = previewImageMap.get(widget.id)!
      layoutContent = generateAutoImagePreviewLayout(widget.id, drawableResourceName)
      logger.info(`Generated auto preview layout for widget '${widget.id}' from preview image`)
    }

    // Write layout file if we have content
    if (layoutContent) {
      fs.writeFileSync(layoutFilePath, layoutContent, 'utf8')
      previewLayoutMap.set(widget.id, layoutResourceName)
    }
  }

  return previewLayoutMap
}
