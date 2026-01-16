//
//  VoltraHomeWidget.swift
//
//  Generic home screen widget infrastructure for Voltra.
//  Widget definitions are generated dynamically by the config plugin.
//

import Foundation
import SwiftUI
import WidgetKit

// MARK: - Shared storage helpers

public enum VoltraHomeWidgetStore {
  public static func readJson(widgetId: String) -> Data? {
    // Try runtime UserDefaults (from updateWidget calls)
    if let group = VoltraConfig.groupIdentifier(),
       let defaults = UserDefaults(suiteName: group),
       let jsonString = defaults.string(forKey: "Voltra_Widget_JSON_\(widgetId)")
    {
      return jsonString.data(using: .utf8)
    }

    return nil
  }

  public static func readDeepLinkUrl(widgetId: String) -> String? {
    guard let group = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: group) else { return nil }
    return defaults.string(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
  }
}

// MARK: - Timeline + entries

public struct VoltraHomeWidgetEntry: TimelineEntry {
  public let date: Date
  public let json: Data?
  public let widgetId: String

  public init(date: Date, json: Data?, widgetId: String) {
    self.date = date
    self.json = json
    self.widgetId = widgetId
  }
}

public struct VoltraHomeWidgetProvider: TimelineProvider {
  public let widgetId: String
  public let initialState: Data?

  public init(widgetId: String, initialState: Data? = nil) {
    self.widgetId = widgetId
    self.initialState = initialState
  }

  public func placeholder(in _: Context) -> VoltraHomeWidgetEntry {
    VoltraHomeWidgetEntry(date: Date(), json: nil, widgetId: widgetId)
  }

  public func getSnapshot(in _: Context, completion: @escaping (VoltraHomeWidgetEntry) -> Void) {
    let data = VoltraHomeWidgetStore.readJson(widgetId: widgetId) ?? initialState
    completion(VoltraHomeWidgetEntry(date: Date(), json: data, widgetId: widgetId))
  }

  public func getTimeline(in _: Context, completion: @escaping (Timeline<VoltraHomeWidgetEntry>) -> Void) {
    let data = VoltraHomeWidgetStore.readJson(widgetId: widgetId) ?? initialState
    let entry = VoltraHomeWidgetEntry(date: Date(), json: data, widgetId: widgetId)
    completion(Timeline(entries: [entry], policy: .never))
  }
}

public struct VoltraHomeWidgetView: View {
  public var entry: VoltraHomeWidgetEntry
  @Environment(\.widgetFamily) var widgetFamily

  public init(entry: VoltraHomeWidgetEntry) {
    self.entry = entry
  }

  public var body: some View {
    Group {
      if let data = entry.json {
        let selected = selectContentForFamily(data, family: widgetFamily)
        buildStaticContentView(data: selected, source: "home_widget")
          .widgetURL(resolveStaticDeepLinkURL(selected, widgetId: entry.widgetId))
      } else {
        placeholderView(widgetId: entry.widgetId)
      }
    }
    .disableWidgetMarginsIfAvailable()
  }

  @ViewBuilder
  private func placeholderView(widgetId _: String) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Almost ready")
        .font(.headline)
      Text("Open the app once to sync data for this widget.")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .padding(16)
    .background(
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .fill(Color(UIColor.secondarySystemBackground))
    )
  }
}

// MARK: - Family-aware content selection

/// Maps WidgetFamily to the JSON key
private func familyToKey(_ family: WidgetFamily) -> String {
  switch family {
  case .systemSmall: return "systemSmall"
  case .systemMedium: return "systemMedium"
  case .systemLarge: return "systemLarge"
  case .systemExtraLarge: return "systemExtraLarge"
  case .accessoryCircular: return "accessoryCircular"
  case .accessoryRectangular: return "accessoryRectangular"
  case .accessoryInline: return "accessoryInline"
  @unknown default: return "systemMedium"
  }
}

/// Select content appropriate for the current widget family.
/// Uses the flat structure like live activities (e.g., "systemSmall", "systemMedium").
private func selectContentForFamily(_ data: Data, family: WidgetFamily) -> Data {
  guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
    // Not valid JSON, return empty
    return Data("[]".utf8)
  }

  let familyKey = familyToKey(family)

  // Try to get content for the specific family
  if let familyContent = root[familyKey] {
    return reconstructWithSharedData(content: familyContent, root: root)
  }

  // Fallback: try families in order of preference
  let fallbackOrder = ["systemMedium", "systemSmall", "systemLarge", "systemExtraLarge",
                       "accessoryRectangular", "accessoryCircular", "accessoryInline"]
  for fallbackKey in fallbackOrder {
    if let fallbackContent = root[fallbackKey] {
      return reconstructWithSharedData(content: fallbackContent, root: root)
    }
  }

  // No content found, return empty
  return Data("[]".utf8)
}

/// Reconstruct JSON with family-specific content plus shared stylesheet and elements.
/// This ensures VoltraNode.parse can resolve style references and element deduplication.
private func reconstructWithSharedData(content: Any, root: [String: Any]) -> Data {
  var result: [String: Any] = [:]

  // If content is a dictionary (single component), wrap it in the result
  // If content is an array or other type, it will be returned as-is below
  if let contentDict = content as? [String: Any] {
    // Copy all keys from the component
    result = contentDict
  }

  // Add shared stylesheet if present (key "s")
  if let stylesheet = root["s"] {
    result["s"] = stylesheet
  }

  // Add shared elements if present (key "e")
  if let sharedElements = root["e"] {
    result["e"] = sharedElements
  }

  // If we built a result dict with shared data, serialize it
  if !result.isEmpty {
    if JSONSerialization.isValidJSONObject(result),
       let data = try? JSONSerialization.data(withJSONObject: result)
    {
      return data
    }
  }

  // Fallback: return content as-is if it's serializable
  if JSONSerialization.isValidJSONObject(content),
     let data = try? JSONSerialization.data(withJSONObject: content)
  {
    return data
  }

  // Final fallback: empty array
  return Data("[]".utf8)
}

// MARK: - Deep link + rendering helpers

private func buildStaticContentView(data: Data, source _: String) -> AnyView {
  let normalized = normalizeJsonData(data) ?? (try? JSONSerialization.data(withJSONObject: [])) ?? Data("[]".utf8)

  guard let jsonString = String(data: normalized, encoding: .utf8),
        let json = try? JSONValue.parse(from: jsonString)
  else {
    return AnyView(
      Text("Failed to render widget")
        .font(.caption)
        .foregroundStyle(.secondary)
    )
  }

  let root = VoltraNode.parse(from: json)

  return AnyView(
    Voltra(root: root, activityId: "widget").frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  )
}

private extension View {
  @ViewBuilder
  func disableWidgetMarginsIfAvailable() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(.clear, for: .widget)
    } else {
      self
    }
  }
}

private func extractRootIdentifier(_ data: Data) -> String? {
  guard let jsonString = String(data: data, encoding: .utf8),
        let json = try? JSONValue.parse(from: jsonString)
  else {
    return nil
  }

  let root = VoltraNode.parse(from: json)
  if case let .element(element) = root {
    return element.id ?? element.type
  }
  return nil
}

private func makeDeepLinkURL(_ data: Data, source: String, kind: String) -> URL? {
  guard let scheme = VoltraDeepLinkResolver.deepLinkScheme() else { return nil }
  let tag = extractRootIdentifier(data) ?? "unknown"
  return URL(string: "\(scheme)://voltraui?kind=\(kind)&source=\(source)&tag=\(tag)")
}

private func resolveStaticDeepLinkURL(_ data: Data, widgetId: String) -> URL? {
  if let raw = VoltraHomeWidgetStore.readDeepLinkUrl(widgetId: widgetId), !raw.isEmpty {
    if raw.contains("://"), let url = URL(string: raw) { return url }
    if let scheme = VoltraDeepLinkResolver.deepLinkScheme() {
      let path = raw.hasPrefix("/") ? raw : "/\(raw)"
      return URL(string: "\(scheme)://\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")
    }
  }
  return makeDeepLinkURL(data, source: "home_widget", kind: "widget")
}

private func normalizeJsonData(_ data: Data) -> Data? {
  guard let obj = try? JSONSerialization.jsonObject(with: data) else { return nil }

  // If it's already an array, use it as-is
  if obj is [Any] {
    return data
  }

  // If it's a single component (dictionary), return as-is
  // Don't wrap in array - VoltraNode.parse handles single objects and needs
  // to find "s" (stylesheet) and "e" (elements) at the root level
  if obj is [String: Any] {
    return data
  }

  // Invalid input (string, number, boolean, null) - return nil to indicate error
  return nil
}
