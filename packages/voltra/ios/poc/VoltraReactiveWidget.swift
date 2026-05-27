// VoltraReactiveWidget.swift — Track 2 PoC
//
// AppIntentConfiguration + JS-in-extension rendering.
//
// The widget stores an unresolved payload (light-dark() colors, {{ appIntent.X }} templates)
// and resolves it at render time via VoltraJSRenderer so SwiftUI environment changes
// (color scheme, widget rendering mode) and user-configured AppIntent parameters
// always produce a fresh, correct render — no server push required.
//
// ── Integration steps (after expo prebuild) ────────────────────────────────────
//
// 1. In VoltraWidgetBundle.swift, add to the bundle body:
//
//      if #available(iOS 17.0, *) {
//        VoltraWidget_reactive()
//      }
//
// 2. In Xcode, select the widget extension target → Build Phases →
//    Copy Bundle Resources → add:
//      packages/ios-renderer/bundle/ios-renderer.js
//    (run `npm run build:bundle -w @use-voltra/ios-renderer` first if missing)
//
// ───────────────────────────────────────────────────────────────────────────────

import AppIntents
import Foundation
import SwiftUI
import WidgetKit

// MARK: - Hardcoded initial payload
//
// Inline styles only (no shared stylesheet) so the family element can be extracted
// and fed to VoltraNode.parse without needing stylesheet index resolution.
// {{ appIntent.teamName }} is substituted by VoltraJSRenderer at render time.
// light-dark() colors are resolved against the current colorScheme at render time.

private let reactiveWidgetPayloadJSON = """
{
  "v": 1,
  "systemSmall": {
    "t": 11,
    "c": [
      {"t": 0, "c": "{{ appIntent.teamName }}", "p": {"c": "light-dark(#111111, #eeeeee)", "fs": 22, "fw": "700"}},
      {"t": 0, "c": "Track 2 PoC", "p": {"c": "light-dark(#666666, #999999)", "fs": 12, "mt": 6}}
    ],
    "p": {"pad": 16, "al": "leading", "fl": 1}
  },
  "systemMedium": {
    "t": 11,
    "c": [
      {"t": 0, "c": "{{ appIntent.teamName }}", "p": {"c": "light-dark(#111111, #eeeeee)", "fs": 22, "fw": "700"}},
      {"t": 0, "c": "Track 2 PoC", "p": {"c": "light-dark(#666666, #999999)", "fs": 14, "mt": 6}},
      {"t": 0, "c": "Edit widget to configure team name", "p": {"c": "light-dark(#999999, #666666)", "fs": 11, "mt": 8}}
    ],
    "p": {"pad": 16, "al": "leading", "fl": 1}
  }
}
"""

// MARK: - AppIntent

@available(iOS 17.0, *)
struct ReactiveWidgetIntent: AppIntent {
  static var title: LocalizedStringResource = "Configure Reactive Widget"

  @Parameter(title: "Team Name", default: "My Team")
  var teamName: String

  init() {}

  init(teamName: String) {
    self.teamName = teamName
  }
}

// MARK: - Timeline entry

@available(iOS 17.0, *)
struct ReactiveWidgetEntry: TimelineEntry {
  let date: Date
  /// Full unresolved payload — family selection + JS resolution happen at render time.
  let rawPayloadJSON: String
  let appIntentParams: [String: String]
}

// MARK: - Provider

@available(iOS 17.0, *)
struct ReactiveWidgetProvider: AppIntentTimelineProvider {
  typealias Intent = ReactiveWidgetIntent
  typealias Entry = ReactiveWidgetEntry

  func placeholder(in _: Context) -> ReactiveWidgetEntry {
    ReactiveWidgetEntry(
      date: Date(),
      rawPayloadJSON: reactiveWidgetPayloadJSON,
      appIntentParams: ["teamName": "My Team"]
    )
  }

  func snapshot(for configuration: Intent, in _: Context) async -> ReactiveWidgetEntry {
    ReactiveWidgetEntry(
      date: Date(),
      rawPayloadJSON: reactiveWidgetPayloadJSON,
      appIntentParams: ["teamName": configuration.teamName]
    )
  }

  func timeline(for configuration: Intent, in _: Context) async -> Timeline<ReactiveWidgetEntry> {
    let entry = ReactiveWidgetEntry(
      date: Date(),
      rawPayloadJSON: reactiveWidgetPayloadJSON,
      appIntentParams: ["teamName": configuration.teamName]
    )
    return Timeline(entries: [entry], policy: .never)
  }
}

// MARK: - View

@available(iOS 17.0, *)
struct ReactiveWidgetView: View {
  let entry: ReactiveWidgetEntry

  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.widgetRenderingMode) private var widgetRenderingMode
  @Environment(\.widgetFamily) private var widgetFamily
  @Environment(\.showsWidgetContainerBackground) private var showsWidgetContainerBackground

  var body: some View {
    let resolvedJSON = VoltraJSRenderer.resolve(
      payloadJSON: entry.rawPayloadJSON,
      colorScheme: colorScheme == .dark ? "dark" : "light",
      widgetRenderingMode: jsRenderingMode(widgetRenderingMode),
      appIntentParams: entry.appIntentParams
    ) ?? entry.rawPayloadJSON

    let rootNode = extractNode(from: resolvedJSON, family: widgetFamily)

    Voltra(
      root: rootNode,
      activityId: "reactive-widget",
      widget: VoltraWidgetEnvironment(
        isHomeScreenWidget: true,
        renderingMode: voltraRenderingMode(widgetRenderingMode),
        showsContainerBackground: showsWidgetContainerBackground
      )
    )
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .modifier(ReactiveWidgetContainerBackground())
  }

  // MARK: - Helpers

  private func extractNode(from resolvedJSON: String, family: WidgetFamily) -> VoltraNode {
    guard let data = resolvedJSON.data(using: .utf8),
          let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let familyContent = root[familyKey(family)] ?? root["systemSmall"],
          let familyData = try? JSONSerialization.data(withJSONObject: familyContent),
          let familyStr = String(data: familyData, encoding: .utf8),
          let jsonValue = try? JSONValue.parse(from: familyStr)
    else { return .empty }

    return VoltraNode.parse(from: jsonValue)
  }

  private func familyKey(_ family: WidgetFamily) -> String {
    switch family {
    case .systemSmall: return "systemSmall"
    case .systemMedium: return "systemMedium"
    case .systemLarge: return "systemLarge"
    default: return "systemSmall"
    }
  }

  private func jsRenderingMode(_ mode: WidgetRenderingMode) -> String {
    switch mode {
    case .accented: return "accented"
    case .vibrant: return "vibrant"
    default: return "fullColor"
    }
  }

  private func voltraRenderingMode(_ mode: WidgetRenderingMode) -> VoltraWidgetRenderingMode {
    switch mode {
    case .accented: return .accented
    case .vibrant: return .vibrant
    default: return .fullColor
    }
  }
}

private struct ReactiveWidgetContainerBackground: ViewModifier {
  func body(content: Content) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      content.containerBackground(.clear, for: .widget)
    } else {
      content
    }
  }
}

// MARK: - Widget definition

@available(iOS 17.0, *)
public struct VoltraWidget_reactive: Widget {
  public init() {}

  public var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: "Voltra_Widget_reactive",
      intent: ReactiveWidgetIntent.self,
      provider: ReactiveWidgetProvider()
    ) { entry in
      ReactiveWidgetView(entry: entry)
    }
    .configurationDisplayName("Reactive Widget")
    .description("JS-in-extension PoC: AppIntent + dark/light mode via on-device JS resolver")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}