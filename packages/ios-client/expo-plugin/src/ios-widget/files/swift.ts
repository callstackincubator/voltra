import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import {
  isWidgetLocalizedMap,
  logger,
  prerenderWidgetState,
  widgetLabelEnglish,
  type PrerenderedWidgetStates,
  type WidgetLabel,
} from '@use-voltra/expo-plugin'

import { DEFAULT_WIDGET_FAMILIES, WIDGET_FAMILY_MAP } from '../../constants'
import type { IOSWidgetConfig } from '../../types'
import { VOLTRA_WIDGET_STRINGS_BASENAME } from '../../utils/fileDiscovery'
import { detectClientRenderedWidgets, type DetectedIOSWidget } from '../clientRendered'
import { prerenderClientRenderedWidgets } from '../clientRenderedPrerender'

export interface GenerateSwiftFilesOptions {
  targetPath: string
  projectRoot: string
  widgets?: IOSWidgetConfig[]
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

  // Dynamic import keeps the plugin CommonJS-compatible while resolving the current package entry.
  const serverModuleId = '@use-voltra/ios/server'
  const { renderWidgetToString } = (await import(serverModuleId)) as {
    renderWidgetToString: RenderWidgetToString
  }

  // Tag each widget with its rendering mode (server vs client) by inspecting the
  // initialStatePath JSX for a 'use voltra' directive. See ../clientRendered.ts.
  // Throws on widget id / component name mismatch.
  const detectedWidgets = detectClientRenderedWidgets(widgets || [], projectRoot)
  const clientWidgetCount = detectedWidgets.filter((w) => w.clientRendered).length
  if (clientWidgetCount > 0) {
    logger.info(`Detected ${clientWidgetCount} client-rendered widget(s) — generating Provider scaffolding`)
  }

  // Prerender widget initial states. Server-rendered widgets go through the existing
  // multi-family WidgetVariants → JSON path; client-rendered widgets go through the
  // client-rendered path (call the 'use voltra' function with default props + minimal env,
  // run renderVoltraVariantToJson, stringify). Both produce entries in the same map shape
  // so VoltraWidgetInitialStates.swift can read either via the same lookup at runtime.
  const serverWidgets = detectedWidgets.filter((w) => !w.clientRendered)
  const serverStates = await prerenderWidgetState(serverWidgets, projectRoot, renderWidgetToString)
  const clientStates = await prerenderClientRenderedWidgets(detectedWidgets, projectRoot)
  const prerenderedStates = new Map([...serverStates, ...clientStates])

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
    detectedWidgets.length > 0 ? generateWidgetBundleSwift(detectedWidgets) : generateDefaultWidgetBundleSwift()

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

function collectGalleryStringsByLocale(widgets: IOSWidgetConfig[]): Map<string, Record<string, string>> {
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
function syncVoltraWidgetGalleryStrings(targetPath: string, widgets: IOSWidgetConfig[] | undefined): void {
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

function widgetUsesGalleryLocalization(widget: IOSWidgetConfig): boolean {
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

/**
 * Generates Swift code for a single widget struct. Dispatches on rendering mode:
 *  - server-rendered → `VoltraHomeWidgetProvider` + `VoltraHomeWidgetView` (existing path)
 *  - client-rendered → `VoltraClientWidgetProvider` + `VoltraClientWidgetContentView`
 *    (the content view internally renders via VoltraHomeWidgetView so the UI layer is
 *    identical to server-rendered widgets — see VoltraClientWidgetRuntime.swift)
 */
function widgetUsesAppIntent(widget: DetectedIOSWidget): boolean {
  return widget.clientRendered && !!widget.appIntent && widget.appIntent.parameters.length > 0
}

function generateWidgetStruct(widget: DetectedIOSWidget): string {
  // Client-rendered widgets with an appIntent config get a native "Edit Widget" sheet via
  // AppIntentConfiguration; the configured params flow into env.configuration.
  if (widgetUsesAppIntent(widget)) {
    return generateClientAppIntentWidgetCode(widget)
  }

  const families = widget.supportedFamilies ?? DEFAULT_WIDGET_FAMILIES
  const familiesSwift = families.map((f) => WIDGET_FAMILY_MAP[f]).join(', ')

  // Sanitize the widget id for use as a Swift identifier
  const structName = `VoltraWidget_${widget.id}`

  const displayNameExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'displayName', widget.displayName)
  const descriptionExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'description', widget.description)

  const providerAndContent = widget.clientRendered
    ? dedent`
        provider: VoltraClientWidgetProvider(
          widgetId: widgetId,
          initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId)
        )
      ) { entry in
        VoltraClientWidgetContentView(
          entry: entry,
          initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId)
        )
      }`
    : dedent`
        provider: VoltraHomeWidgetProvider(
          widgetId: widgetId,
          initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId)
        )
      ) { entry in
        VoltraHomeWidgetView(entry: entry)
      }`

  return dedent`
    public struct ${structName}: Widget {
      private let widgetId = "${widget.id}"

      public init() {}

      public var body: some WidgetConfiguration {
        StaticConfiguration(
          kind: "Voltra_Widget_${widget.id}",
          ${providerAndContent}
        .configurationDisplayName(${displayNameExpr})
        .description(${descriptionExpr})
        .supportedFamilies([${familiesSwift}])
        .contentMarginsDisabled()
      }
    }
  `
}

/**
 * Generates a client-rendered widget backed by AppIntentConfiguration (iOS 17+): a
 * WidgetConfigurationIntent (params + code defaults), an AppIntentTimelineProvider that loads the
 * bundle via the shared client runtime, and an AppIntentConfiguration widget. The configured
 * params are passed into the render as env.configuration; the native "Edit Widget" sheet edits them.
 */
function generateClientAppIntentWidgetCode(widget: DetectedIOSWidget): string {
  const params = widget.appIntent!.parameters
  const families = widget.supportedFamilies ?? DEFAULT_WIDGET_FAMILIES
  const familiesSwift = families.map((f) => WIDGET_FAMILY_MAP[f]).join(', ')
  const intentName = `VoltraWidget_${widget.id}_Intent`
  const providerName = `VoltraWidget_${widget.id}_ClientProvider`
  const intentTitle = escapeForSwiftStringLiteral(`Configure ${widgetLabelEnglish(widget.displayName)}`)
  const displayNameExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'displayName', widget.displayName)
  const descriptionExpr = iosWidgetGalleryLabelSwiftExpr(widget.id, 'description', widget.description)

  const swiftDefault = (p: { default?: string }) => `"${escapeForSwiftStringLiteral(p.default ?? '')}"`
  const dictLiteral = (entries: string[]) => (entries.length > 0 ? `[${entries.join(', ')}]` : '[:]')

  const paramDecls = params
    .map(
      (p) =>
        `  @Parameter(title: "${escapeForSwiftStringLiteral(p.title)}", default: ${swiftDefault(p)})\n  var ${
          p.name
        }: String`
    )
    .join('\n\n')
  const initParams = params.map((p) => `${p.name}: String`).join(', ')
  const initBody = params.map((p) => `    self.${p.name} = ${p.name}`).join('\n')
  const configuredDict = dictLiteral(params.map((p) => `"${p.name}": configuration.${p.name}`))
  const defaultDict = dictLiteral(params.map((p) => `"${p.name}": ${swiftDefault(p)}`))

  return dedent`
    // MARK: - Client-rendered AppIntent widget: ${widget.id}

    @available(iOS 17.0, *)
    struct ${intentName}: WidgetConfigurationIntent {
      static var title: LocalizedStringResource = "${intentTitle}"

    ${paramDecls}

      init() {}
      init(${initParams}) {
    ${initBody}
      }
    }

    @available(iOS 17.0, *)
    private struct ${providerName}: AppIntentTimelineProvider {
      typealias Intent = ${intentName}
      typealias Entry = VoltraClientWidgetEntry

      private let widgetId = "${widget.id}"

      func placeholder(in _: Context) -> VoltraClientWidgetEntry {
        VoltraClientWidgetEntry(date: Date(), widgetId: widgetId, bundleReady: false, configuration: ${defaultDict})
      }

      func snapshot(for configuration: ${intentName}, in _: Context) async -> VoltraClientWidgetEntry {
        await VoltraClientWidgetProvider.loadEntry(widgetId: widgetId, configuration: ${configuredDict})
      }

      func timeline(for configuration: ${intentName}, in _: Context) async -> Timeline<VoltraClientWidgetEntry> {
        let entry = await VoltraClientWidgetProvider.loadEntry(widgetId: widgetId, configuration: ${configuredDict})
        return Timeline(entries: [entry], policy: .never)
      }
    }

    @available(iOS 17.0, *)
    public struct VoltraWidget_${widget.id}: Widget {
      private let widgetId = "${widget.id}"

      public init() {}

      public var body: some WidgetConfiguration {
        AppIntentConfiguration(
          kind: "Voltra_Widget_${widget.id}",
          intent: ${intentName}.self,
          provider: ${providerName}()
        ) { entry in
          VoltraClientWidgetContentView(
            entry: entry,
            initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId)
          )
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
function generateWidgetBundleSwift(widgets: DetectedIOSWidget[]): string {
  // Generate widget structs
  const widgetStructs = widgets.map((w) => generateWidgetStruct(w)).join('\n\n')

  // AppIntent widgets are iOS 17+, so their bundle entries are gated behind #available.
  const appIntentWidgets = widgets.filter(widgetUsesAppIntent)
  const plainWidgets = widgets.filter((w) => !widgetUsesAppIntent(w))
  const plainInstances = plainWidgets.map((w) => `VoltraWidget_${w.id}()`).join('\n    ')
  const appIntentInstances =
    appIntentWidgets.length > 0
      ? `if #available(iOS 17.0, *) {\n      ${appIntentWidgets
          .map((w) => `VoltraWidget_${w.id}()`)
          .join('\n      ')}\n    }`
      : ''
  const widgetInstances = [plainInstances, appIntentInstances].filter(Boolean).join('\n    ')

  const needsFoundation = widgets.some(widgetUsesGalleryLocalization)
  const foundationImport = needsFoundation ? 'import Foundation\n' : ''
  const appIntentsImport = appIntentWidgets.length > 0 ? 'import AppIntents\n' : ''

  return dedent`
    //
    //  VoltraWidgetBundle.swift
    //
    //  Auto-generated by Voltra config plugin.
    //  This file defines which Voltra widgets are available in your app.
    //

    ${foundationImport}${appIntentsImport}import SwiftUI
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

    ${GENERATED_INITIAL_STATE_LOCALE_HELPER}

    public enum VoltraWidgetInitialStates {
      private static let bundledLocalizedStates: [String: [String: String]] = [
        ${widgetEntries}
      ]

      /// Get the bundled initial state JSON for a widget, matching the device locale when multiple locales were built.
      /// Returns nil if no initial state was configured for the widget.
      public static func getInitialState(for widgetId: String) -> Data? {
        guard let perLocale = bundledLocalizedStates[widgetId] else { return nil }
        let tags = VoltraGeneratedInitialStateLocale.preferredLanguageTags()
        guard let jsonString = VoltraGeneratedInitialStateLocale.pickJson(from: perLocale, preferredLanguages: tags) else {
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

export const __test__ = {
  generateInitialStatesSwift,
  generateWidgetBundleSwift,
}
