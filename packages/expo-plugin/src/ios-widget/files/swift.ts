import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import { DEFAULT_WIDGET_FAMILIES, WIDGET_FAMILY_MAP } from '../../constants'
import type { WidgetConfig, WidgetLabel } from '../../types'
import { VOLTRA_WIDGET_STRINGS_BASENAME } from '../../utils/fileDiscovery'
import { logger } from '../../utils/logger'
import type { PrerenderedWidgetStates } from '../../utils/prerender'
import { prerenderWidgetState } from '../../utils/prerender'
import { isWidgetLocalizedMap, widgetLabelEnglish } from '../../utils/widgetLabel'

export interface GenerateSwiftFilesOptions {
  targetPath: string
  projectRoot: string
  widgets?: WidgetConfig[]
}

type RenderWidgetToString = (variants: unknown) => string

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates all Swift files for the widget extension.
 *
 * This creates:
 * - VoltraWidgetInitialStates.swift (pre-rendered widget states)
 * - VoltraWidgetBundle.swift (widget bundle definition)
 */
export async function generateSwiftFiles(options: GenerateSwiftFilesOptions): Promise<void> {
  const { targetPath, projectRoot, widgets } = options

  // Dynamic import for ESM module compatibility
  // voltra/server is an ESM module, but the plugin is compiled to CommonJS
  const serverModuleId = 'voltra/server'
  const { renderWidgetToString } = (await import(serverModuleId)) as {
    renderWidgetToString: RenderWidgetToString
  }

  // Prerender widget initial states if any widgets have initialStatePath configured
  const prerenderedStates = await prerenderWidgetState(widgets || [], projectRoot, renderWidgetToString)

  syncVoltraWidgetGalleryStrings(targetPath, widgets)

  // Generate the initial states Swift file
  const initialStatesContent = generateInitialStatesSwift(prerenderedStates)
  const initialStatesPath = path.join(targetPath, 'VoltraWidgetInitialStates.swift')
  fs.writeFileSync(initialStatesPath, initialStatesContent)

  logger.info(
    `Generated VoltraWidgetInitialStates.swift with ${prerenderedStates.size} widget(s) (localized initial states where configured)`
  )

  // Generate the widget bundle Swift file
  const widgetBundleContent =
    widgets && widgets.length > 0 ? generateWidgetBundleSwift(widgets) : generateDefaultWidgetBundleSwift()

  const widgetBundlePath = path.join(targetPath, 'VoltraWidgetBundle.swift')
  fs.writeFileSync(widgetBundlePath, widgetBundleContent)

  logger.info(`Generated VoltraWidgetBundle.swift with ${widgets?.length ?? 0} home screen widgets`)
}

// ============================================================================
// Widget gallery localization: *.lproj/VoltraWidgets.strings + LocalizedStringResource
//
// We use classic .strings tables (not .xcstrings): the `xcode` npm library assigns
// unknown lastKnownFileType to .xcstrings, so Xcode may not treat them as string tables
// and lookups fall back to English defaultValue.
//
// LocalizedStringResource is still appropriate for extensions (deferred resolution).
// https://developer.apple.com/documentation/foundation/localizedstringresource
// ============================================================================

function escapeForSwiftStringLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function escapeDotStringsValue(s: string): string {
  return escapeForSwiftStringLiteral(s)
}

function collectGalleryStringsByLocale(widgets: WidgetConfig[]): Map<string, Record<string, string>> {
  const byLocale = new Map<string, Record<string, string>>()

  const add = (locale: string, key: string, value: string) => {
    let bucket = byLocale.get(locale)
    if (!bucket) {
      bucket = {}
      byLocale.set(locale, bucket)
    }
    bucket[key] = value
  }

  for (const w of widgets) {
    if (isWidgetLocalizedMap(w.displayName)) {
      const key = `voltra_widget_${w.id}_displayName`
      for (const [locale, val] of Object.entries(w.displayName)) {
        if (typeof val === 'string' && val.trim()) {
          add(locale, key, val)
        }
      }
    }
    if (isWidgetLocalizedMap(w.description)) {
      const key = `voltra_widget_${w.id}_description`
      for (const [locale, val] of Object.entries(w.description)) {
        if (typeof val === 'string' && val.trim()) {
          add(locale, key, val)
        }
      }
    }
  }

  return byLocale
}

function formatVoltraWidgetsStringsFile(entries: Record<string, string>): string {
  const sortedKeys = Object.keys(entries).sort()
  const lines = sortedKeys.map((k) => `"${k}" = "${escapeDotStringsValue(entries[k]!)}";`)
  return `/* Voltra widget gallery strings (auto-generated) */\n${lines.join('\n')}\n`
}

/** Remove generated gallery strings and obsolete string catalog before rewriting. */
function clearVoltraWidgetGalleryStringArtifacts(targetPath: string): void {
  const catalogPath = path.join(targetPath, 'VoltraWidgets.xcstrings')
  if (fs.existsSync(catalogPath)) {
    fs.unlinkSync(catalogPath)
  }

  if (!fs.existsSync(targetPath)) {
    return
  }

  for (const entry of fs.readdirSync(targetPath)) {
    if (!entry.endsWith('.lproj')) {
      continue
    }
    const stringsPath = path.join(targetPath, entry, VOLTRA_WIDGET_STRINGS_BASENAME)
    if (fs.existsSync(stringsPath)) {
      fs.unlinkSync(stringsPath)
    }
    const dirPath = path.join(targetPath, entry)
    try {
      if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath)
      }
    } catch {
      /* ignore */
    }
  }
}

/**
 * Writes `<locale>.lproj/VoltraWidgets.strings` for locale-map gallery labels.
 */
function syncVoltraWidgetGalleryStrings(targetPath: string, widgets: WidgetConfig[] | undefined): void {
  const list = widgets ?? []
  clearVoltraWidgetGalleryStringArtifacts(targetPath)

  if (list.length === 0) {
    return
  }

  const byLocale = collectGalleryStringsByLocale(list)
  if (byLocale.size === 0) {
    return
  }

  for (const [locale, kv] of byLocale) {
    const lproj = path.join(targetPath, `${locale}.lproj`)
    fs.mkdirSync(lproj, { recursive: true })
    fs.writeFileSync(path.join(lproj, VOLTRA_WIDGET_STRINGS_BASENAME), formatVoltraWidgetsStringsFile(kv), 'utf8')
  }
}

function widgetUsesGalleryLocalization(widget: WidgetConfig): boolean {
  return isWidgetLocalizedMap(widget.displayName) || isWidgetLocalizedMap(widget.description)
}

/**
 * Widget gallery title / description: deferred lookup via LocalizedStringResource when using a locale map
 * (recommended for extensions); plain Text for single-string config.
 */
function iosWidgetGalleryLabelSwiftExpr(widgetId: string, field: 'displayName' | 'description', label: WidgetLabel): string {
  if (!isWidgetLocalizedMap(label)) {
    return `Text("${escapeForSwiftStringLiteral(label)}")`
  }

  const key = `voltra_widget_${widgetId}_${field}`
  const defaultEnglish = escapeForSwiftStringLiteral(widgetLabelEnglish(label))

  return `Text(LocalizedStringResource("${key}", defaultValue: String.LocalizationValue("${defaultEnglish}"), table: "VoltraWidgets"))`
}

/**
 * Generates Swift code for a single widget struct
 */
function generateWidgetStruct(widget: WidgetConfig): string {
  const families = widget.supportedFamilies ?? DEFAULT_WIDGET_FAMILIES
  const familiesSwift = families.map((f) => WIDGET_FAMILY_MAP[f]).join(', ')

  // Sanitize the widget id for use as a Swift identifier
  const structName = `VoltraWidget_${widget.id}`

  const displayNameExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'displayName', widget.displayName)
  const descriptionExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'description', widget.description)

  return dedent`
    public struct ${structName}: Widget {
      private let widgetId = "${widget.id}"

      public init() {}

      public var body: some WidgetConfiguration {
        StaticConfiguration(
          kind: "Voltra_Widget_${widget.id}",
          provider: VoltraHomeWidgetProvider(
            widgetId: widgetId,
            initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId)
          )
        ) { entry in
          VoltraHomeWidgetView(entry: entry)
        }
        .configurationDisplayName(${displayNameExpr})
        .description(${descriptionExpr})
        .supportedFamilies([${familiesSwift}])
        .contentMarginsDisabled()
      }
    }
  `
}

/**
 * Generates the VoltraWidgetBundle.swift file content with configured widgets
 */
function generateWidgetBundleSwift(widgets: WidgetConfig[]): string {
  // Generate widget structs
  const widgetStructs = widgets.map(generateWidgetStruct).join('\n\n')

  // Generate widget bundle body entries
  const widgetInstances = widgets.map((w) => `VoltraWidget_${w.id}()`).join('\n    ')

  const needsFoundation = widgets.some(widgetUsesGalleryLocalization)
  const foundationImport = needsFoundation ? 'import Foundation\n' : ''

  return dedent`
    //
    //  VoltraWidgetBundle.swift
    //
    //  Auto-generated by Voltra config plugin.
    //  This file defines which Voltra widgets are available in your app.
    //

    ${foundationImport}import SwiftUI
    import WidgetKit
    import VoltraWidget

    @main
    struct VoltraWidgetBundle: WidgetBundle {
      var body: some Widget {
        // Live Activity (with Watch/CarPlay support)
        VoltraWidget()

        // Home Screen Widgets
        ${widgetInstances}
      }
    }

    // MARK: - Home Screen Widget Definitions

    ${widgetStructs}
  `
}

/**
 * Generates the VoltraWidgetBundle.swift file content when no widgets are configured
 * (only Live Activities)
 */
function generateDefaultWidgetBundleSwift(): string {
  return dedent`
    //
    //  VoltraWidgetBundle.swift
    //
    //  This file defines which Voltra widgets are available in your app.
    //  You can customize which widgets to include by adding or removing them below.
    //

    import SwiftUI
    import WidgetKit
    import VoltraWidget  // Import Voltra widgets

    @main
    struct VoltraWidgetBundle: WidgetBundle {
      var body: some Widget {
        // Live Activity (with Watch/CarPlay support)
        VoltraWidget()
      }
    }
  `
}

// ============================================================================
// Initial States
// ============================================================================

/**
 * Generates Swift code that bundles pre-rendered widget initial states (per locale when configured).
 */
function generateInitialStatesSwift(prerenderedStates: PrerenderedWidgetStates): string {
  if (prerenderedStates.size === 0) {
    return generateEmptyInitialStatesSwift()
  }

  const widgetEntries = Array.from(prerenderedStates.entries())
    .map(([widgetId, perLocale]) => {
      const localeEntries = Array.from(perLocale.entries())
        .map(([localeKey, json]) => {
          const delimiter = getSwiftRawStringDelimiter(json)
          return `"${escapeForSwiftStringLiteral(localeKey)}": ${delimiter}"${json}"${delimiter}`
        })
        .join(',\n        ')
      return `"${widgetId}": [\n        ${localeEntries}\n      ]`
    })
    .join(',\n    ')

  return dedent`
    //
    //  VoltraWidgetInitialStates.swift
    //
    //  Auto-generated by Voltra config plugin.
    //  Contains pre-rendered initial states for home screen widgets.
    //

    import Foundation

    public enum VoltraWidgetInitialStates {
      private static let bundledLocalizedStates: [String: [String: String]] = [
        ${widgetEntries}
      ]

      /// Get the bundled initial state JSON for a widget, matching the device locale when multiple locales were built.
      /// Returns nil if no initial state was configured for the widget.
      public static func getInitialState(for widgetId: String) -> Data? {
        guard let perLocale = bundledLocalizedStates[widgetId] else { return nil }
        let tags = VoltraInitialStateLocale.preferredLanguageTags()
        guard let jsonString = VoltraInitialStateLocale.pickJson(from: perLocale, preferredLanguages: tags) else {
          return nil
        }
        return jsonString.data(using: .utf8)
      }
    }
  `
}

/**
 * Generates empty Swift code when no widgets have initial states configured.
 */
function generateEmptyInitialStatesSwift(): string {
  return dedent`
    //
    //  VoltraWidgetInitialStates.swift
    //
    //  Auto-generated by Voltra config plugin.
    //  No widget initial states configured.
    //

    import Foundation

    public enum VoltraWidgetInitialStates {
      /// Get the bundled initial state JSON for a widget.
      /// Always returns nil since no initial states are configured.
      public static func getInitialState(for widgetId: String) -> Data? {
        return nil
      }
    }
  `
}

/**
 * Determines the appropriate Swift raw string delimiter for a given string.
 * Counts the maximum consecutive '#' characters after a '"' in the content
 * and returns a delimiter with one more '#' than that maximum.
 *
 * For example:
 * - Content has no '"#' → returns '#'
 * - Content has '"#' (1 hash) → returns '##'
 * - Content has '"##' (2 hashes) → returns '###'
 */
function getSwiftRawStringDelimiter(str: string): string {
  // Find all sequences of '#' that follow a '"'
  const matches = str.match(/"#+/g)

  if (!matches) {
    return '#'
  }

  // Find the maximum number of consecutive '#' after a '"'
  const maxHashes = Math.max(...matches.map((m) => m.length - 1)) // -1 to exclude the '"'
  return '#'.repeat(maxHashes + 1)
}
