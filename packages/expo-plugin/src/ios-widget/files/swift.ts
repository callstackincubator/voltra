import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import { DEFAULT_WIDGET_FAMILIES, WIDGET_FAMILY_MAP } from '../../constants'
import type { WidgetConfig, WidgetLabel, WidgetParameter } from '../../types'
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

  // Prerender outdated states for configurable widgets that have outdatedStatePath configured
  const outdatedStateWidgets = (widgets || [])
    .filter((w) => w.outdatedStatePath)
    .map((w) => ({ ...w, initialStatePath: w.outdatedStatePath }))
  const prerenderedOutdatedStates = await prerenderWidgetState(outdatedStateWidgets, projectRoot, renderWidgetToString)

  syncVoltraWidgetGalleryStrings(targetPath, widgets)

  // Generate the initial states Swift file (includes outdated states)
  const initialStatesContent = generateInitialStatesSwift(prerenderedStates, prerenderedOutdatedStates)
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

const GENERATED_INITIAL_STATE_LOCALE_HELPER = dedent`
  private enum VoltraGeneratedInitialStateLocale {
    static func pickJson(from perLocale: [String: String], preferredLanguages: [String]) -> String? {
      let entries = perLocale.filter { !$0.value.isEmpty }
      if entries.isEmpty {
        return nil
      }

      func normalize(_ tag: String) -> String {
        tag.trimmingCharacters(in: .whitespacesAndNewlines)
          .lowercased()
          .replacingOccurrences(of: "_", with: "-")
      }

      var byNorm: [String: String] = [:]
      for (k, v) in entries {
        byNorm[normalize(k)] = v
      }

      for pref in preferredLanguages {
        let n = normalize(pref)
        if let direct = byNorm[n] {
          return direct
        }
        let lang = n.split(separator: "-").first.map(String.init) ?? n
        for (key, val) in entries {
          let kn = normalize(key)
          let keyLang = kn.split(separator: "-").first.map(String.init) ?? kn
          if keyLang == lang {
            return val
          }
        }
      }

      if let en = byNorm["en"] {
        return en
      }
      if let englishFamily = entries.keys.sorted().first(where: {
        let normalized = normalize($0)
        return normalized == "en" || normalized.hasPrefix("en-")
      }) {
        return entries[englishFamily]
      }
      if let def = byNorm["__default"] {
        return def
      }

      let sorted = entries.keys.sorted()
      guard let firstKey = sorted.first else {
        return nil
      }
      return entries[firstKey]
    }

    static func preferredLanguageTags() -> [String] {
      Locale.preferredLanguages
    }
  }
`

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
function iosWidgetGalleryLabelSwiftExpr(
  widgetId: string,
  field: 'displayName' | 'description',
  label: WidgetLabel
): string {
  if (!isWidgetLocalizedMap(label)) {
    return `Text("${escapeForSwiftStringLiteral(label)}")`
  }

  const key = `voltra_widget_${widgetId}_${field}`
  const defaultEnglish = escapeForSwiftStringLiteral(widgetLabelEnglish(label))

  return `Text(LocalizedStringResource("${key}", defaultValue: String.LocalizationValue("${defaultEnglish}"), table: "VoltraWidgets"))`
}

// ============================================================================
// Configurable Widget Code Generation
// ============================================================================

/** Turns an arbitrary string into a valid Swift identifier. */
function sanitizeSwiftIdentifier(s: string): string {
  const sanitized = s.replace(/[^a-zA-Z0-9_]/g, '_')
  return /^[0-9]/.test(sanitized) ? `_${sanitized}` : sanitized
}

/** Generates an AppEnum Swift type for a single enum parameter. */
function generateParameterEnum(widgetId: string, param: WidgetParameter & { type: 'enum' }): string {
  const enumName = `VoltraWidget_${widgetId}_${param.id}`
  const title = escapeForSwiftStringLiteral(widgetLabelEnglish(param.label))

  const cases = param.cases
    .map((c) => `  case ${sanitizeSwiftIdentifier(c.value)} = "${escapeForSwiftStringLiteral(c.value)}"`)
    .join('\n')

  const caseReprs = param.cases
    .map(
      (c) =>
        `    .${sanitizeSwiftIdentifier(c.value)}: "${escapeForSwiftStringLiteral(widgetLabelEnglish(c.label))}"`
    )
    .join(',\n')

  return dedent`
    @available(iOS 17.0, *)
    enum ${enumName}: String, AppEnum {
    ${cases}

      static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "${title}")
      static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    ${caseReprs},
      ]
    }
  `
}

/** Generates the WidgetConfigurationIntent struct for a configurable widget. */
function generateWidgetIntent(widget: WidgetConfig): string {
  const intentName = `VoltraWidget_${widget.id}_Intent`
  const params = widget.parameters!

  const paramDecls = params
    .map((p) => {
      const title = escapeForSwiftStringLiteral(widgetLabelEnglish(p.label))
      switch (p.type) {
        case 'bool': {
          const def = p.default !== undefined ? (p.default ? 'true' : 'false') : 'false'
          return `  @Parameter(title: "${title}", default: ${def})\n  var ${p.id}: Bool`
        }
        case 'int': {
          const def = p.default !== undefined ? String(Math.trunc(p.default)) : '0'
          return `  @Parameter(title: "${title}", default: ${def})\n  var ${p.id}: Int`
        }
        case 'double': {
          const def = p.default !== undefined ? String(p.default) : '0.0'
          return `  @Parameter(title: "${title}", default: ${def})\n  var ${p.id}: Double`
        }
        case 'enum': {
          const enumName = `VoltraWidget_${widget.id}_${p.id}`
          const defaultCase = p.default !== undefined ? p.default : p.cases[0]?.value ?? ''
          const def = `.${sanitizeSwiftIdentifier(defaultCase)}`
          return `  @Parameter(title: "${title}", default: ${def})\n  var ${p.id}: ${enumName}`
        }
      }
    })
    .join('\n\n')

  const paramValues = params
    .map((p) => {
      switch (p.type) {
        case 'bool':
          return `      "${p.id}": ${p.id} ? "true" : "false"`
        case 'int':
          return `      "${p.id}": String(${p.id})`
        case 'double':
          return `      "${p.id}": String(${p.id})`
        case 'enum':
          return `      "${p.id}": ${p.id}.rawValue`
      }
    })
    .join(',\n')

  const title = escapeForSwiftStringLiteral(`Configure ${widgetLabelEnglish(widget.displayName)}`)

  return dedent`
    @available(iOS 17.0, *)
    struct ${intentName}: VoltraWidgetConfigurationIntent {
      static var title: LocalizedStringResource = "${title}"

    ${paramDecls}

      init() {}

      var parameterValues: [String: String] {
        [
    ${paramValues},
        ]
      }
    }
  `
}

/**
 * Generates Swift code for a configurable widget struct (iOS 17+).
 * Uses AppIntentConfiguration and VoltraConfigurableHomeWidgetProvider.
 */
function generateConfigurableWidgetStruct(widget: WidgetConfig): string {
  const families = widget.supportedFamilies ?? DEFAULT_WIDGET_FAMILIES
  const familiesSwift = families.map((f) => WIDGET_FAMILY_MAP[f]).join(', ')
  const structName = `VoltraWidget_${widget.id}`
  const intentName = `VoltraWidget_${widget.id}_Intent`

  const displayNameExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'displayName', widget.displayName)
  const descriptionExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'description', widget.description)

  return dedent`
    @available(iOS 17.0, *)
    public struct ${structName}: Widget {
      private let widgetId = "${widget.id}"

      public init() {}

      public var body: some WidgetConfiguration {
        AppIntentConfiguration(
          kind: "Voltra_Widget_${widget.id}",
          intent: ${intentName}.self,
          provider: VoltraConfigurableHomeWidgetProvider<${intentName}>(
            widgetId: widgetId,
            initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId),
            outdatedState: VoltraWidgetInitialStates.getOutdatedState(for: widgetId)
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
 * Generates Swift code for a single widget struct.
 * Configurable widgets (with parameters) use AppIntentConfiguration; others use StaticConfiguration.
 */
function generateWidgetStruct(widget: WidgetConfig): string {
  if (widget.parameters && widget.parameters.length > 0) {
    return generateConfigurableWidgetStruct(widget)
  }

  const families = widget.supportedFamilies ?? DEFAULT_WIDGET_FAMILIES
  const familiesSwift = families.map((f) => WIDGET_FAMILY_MAP[f]).join(', ')
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
  const configurableWidgets = widgets.filter((w) => w.parameters && w.parameters.length > 0)
  const staticWidgets = widgets.filter((w) => !w.parameters || w.parameters.length === 0)

  // Generate enum types and intent structs for configurable widgets
  const configurableTypes = configurableWidgets
    .flatMap((w) => [
      ...w.parameters!.filter((p): p is WidgetParameter & { type: 'enum' } => p.type === 'enum').map((p) =>
        generateParameterEnum(w.id, p)
      ),
      generateWidgetIntent(w),
    ])
    .join('\n\n')

  // Generate widget structs (configurable first, then static)
  const widgetStructs = widgets.map(generateWidgetStruct).join('\n\n')

  // Bundle body: static widgets are instantiated directly; configurable ones are guarded
  const widgetInstances = [
    ...staticWidgets.map((w) => `VoltraWidget_${w.id}()`),
    ...(configurableWidgets.length > 0
      ? [
          `if #available(iOSApplicationExtension 17.0, *) {\n        ${configurableWidgets
            .map((w) => `VoltraWidget_${w.id}()`)
            .join('\n        ')}\n      }`,
        ]
      : []),
  ].join('\n        ')

  const needsFoundation = widgets.some(widgetUsesGalleryLocalization)
  const foundationImport = needsFoundation ? 'import Foundation\n' : ''
  const appIntentsImport = configurableWidgets.length > 0 ? 'import AppIntents\n' : ''

  const configurableSection =
    configurableTypes.length > 0
      ? `\n// MARK: - Configurable Widget Types\n\n${configurableTypes}\n`
      : ''

  return dedent`
    //
    //  VoltraWidgetBundle.swift
    //
    //  Auto-generated by Voltra config plugin.
    //  This file defines which Voltra widgets are available in your app.
    //

    ${appIntentsImport}${foundationImport}import SwiftUI
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
    ${configurableSection}
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

function buildBundledStatesDict(prerenderedStates: PrerenderedWidgetStates): string {
  return Array.from(prerenderedStates.entries())
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
}

/**
 * Generates Swift code that bundles pre-rendered widget initial states and outdated states.
 */
function generateInitialStatesSwift(
  prerenderedStates: PrerenderedWidgetStates,
  prerenderedOutdatedStates: PrerenderedWidgetStates = new Map()
): string {
  const hasInitial = prerenderedStates.size > 0
  const hasOutdated = prerenderedOutdatedStates.size > 0
  const needsLocaleHelper = hasInitial || hasOutdated

  const localeHelperSection = needsLocaleHelper ? `\n${GENERATED_INITIAL_STATE_LOCALE_HELPER}\n` : ''

  const initialStatesDict = hasInitial ? buildBundledStatesDict(prerenderedStates) : ''
  const outdatedStatesDict = hasOutdated ? buildBundledStatesDict(prerenderedOutdatedStates) : ''

  const initialStatesDecl = hasInitial
    ? `  private static let bundledLocalizedStates: [String: [String: String]] = [\n    ${initialStatesDict}\n  ]`
    : `  private static let bundledLocalizedStates: [String: [String: String]] = [:]`

  const outdatedStatesDecl = hasOutdated
    ? `  private static let bundledLocalizedOutdatedStates: [String: [String: String]] = [\n    ${outdatedStatesDict}\n  ]`
    : `  private static let bundledLocalizedOutdatedStates: [String: [String: String]] = [:]`

  const getStateFn = needsLocaleHelper
    ? `  public static func getInitialState(for widgetId: String) -> Data? {
    guard let perLocale = bundledLocalizedStates[widgetId] else { return nil }
    let tags = VoltraGeneratedInitialStateLocale.preferredLanguageTags()
    guard let jsonString = VoltraGeneratedInitialStateLocale.pickJson(from: perLocale, preferredLanguages: tags) else {
      return nil
    }
    return jsonString.data(using: .utf8)
  }`
    : `  public static func getInitialState(for widgetId: String) -> Data? { return nil }`

  const getOutdatedFn = needsLocaleHelper
    ? `  public static func getOutdatedState(for widgetId: String) -> Data? {
    guard let perLocale = bundledLocalizedOutdatedStates[widgetId] else { return nil }
    let tags = VoltraGeneratedInitialStateLocale.preferredLanguageTags()
    guard let jsonString = VoltraGeneratedInitialStateLocale.pickJson(from: perLocale, preferredLanguages: tags) else {
      return nil
    }
    return jsonString.data(using: .utf8)
  }`
    : `  public static func getOutdatedState(for widgetId: String) -> Data? { return nil }`

  return dedent`
    //
    //  VoltraWidgetInitialStates.swift
    //
    //  Auto-generated by Voltra config plugin.
    //  Contains pre-rendered initial and outdated states for home screen widgets.
    //

    import Foundation
    ${localeHelperSection}
    public enum VoltraWidgetInitialStates {
    ${initialStatesDecl}

    ${outdatedStatesDecl}

      /// Get the bundled initial state JSON for a widget, matching the device locale.
      /// Returns nil if no initial state was configured for the widget.
    ${getStateFn}

      /// Get the bundled outdated state JSON for a configurable widget, matching the device locale.
      /// Shown when widget parameters change but the React Native app hasn't re-rendered yet.
      /// Returns nil if no outdated state was configured for the widget.
    ${getOutdatedFn}
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

export const __test__ = {
  generateInitialStatesSwift,
  generateParameterEnum,
  generateWidgetIntent,
  generateConfigurableWidgetStruct,
}
