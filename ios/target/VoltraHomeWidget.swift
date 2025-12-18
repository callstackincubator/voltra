//
//  VoltraHomeWidget.swift
//
//  Generic home screen widget infrastructure for Voltra.
//  Widget definitions are generated dynamically by the config plugin.
//

import SwiftUI
import WidgetKit
import Foundation

// MARK: - Shared storage helpers

public enum VoltraHomeWidgetStore {
  public static func readJson(widgetId: String) -> Data? {
    guard let group = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: group),
          let jsonString = defaults.string(forKey: "Voltra_Widget_JSON_\(widgetId)")
    else { return nil }
    return jsonString.data(using: .utf8)
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
  
  public init(widgetId: String) {
    self.widgetId = widgetId
  }

  public func placeholder(in context: Context) -> VoltraHomeWidgetEntry {
    VoltraHomeWidgetEntry(date: Date(), json: nil, widgetId: widgetId)
  }

  public func getSnapshot(in context: Context, completion: @escaping (VoltraHomeWidgetEntry) -> Void) {
    let data = VoltraHomeWidgetStore.readJson(widgetId: widgetId)
    completion(VoltraHomeWidgetEntry(date: Date(), json: data, widgetId: widgetId))
  }

  public func getTimeline(in context: Context, completion: @escaping (Timeline<VoltraHomeWidgetEntry>) -> Void) {
    let data = VoltraHomeWidgetStore.readJson(widgetId: widgetId)
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
  private func placeholderView(widgetId: String) -> some View {
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
fileprivate func familyToKey(_ family: WidgetFamily) -> String {
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
fileprivate func selectContentForFamily(_ data: Data, family: WidgetFamily) -> Data {
  guard let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
    // Not valid JSON, return empty
    return Data("[]".utf8)
  }

  let familyKey = familyToKey(family)

  // Try to get content for the specific family
  if let familyContent = root[familyKey] {
    if JSONSerialization.isValidJSONObject(familyContent),
       let familyData = try? JSONSerialization.data(withJSONObject: familyContent) {
      return familyData
    }
  }

  // Fallback: try families in order of preference
  let fallbackOrder = ["systemMedium", "systemSmall", "systemLarge", "systemExtraLarge",
                       "accessoryRectangular", "accessoryCircular", "accessoryInline"]
  for fallbackKey in fallbackOrder {
    if let fallbackContent = root[fallbackKey] {
      if JSONSerialization.isValidJSONObject(fallbackContent),
         let fallbackData = try? JSONSerialization.data(withJSONObject: fallbackContent) {
        return fallbackData
      }
    }
  }

  // No content found, return empty
  return Data("[]".utf8)
}

// MARK: - Deep link + rendering helpers

fileprivate func buildStaticContentView(data: Data, source: String) -> AnyView {
  let normalized = normalizeJsonData(data) ?? (try? JSONSerialization.data(withJSONObject: [])) ?? Data("[]".utf8)

  guard let jsonString = String(data: normalized, encoding: .utf8),
        let json = try? JSONValue.parse(from: jsonString) else {
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
      self.containerBackground(.clear, for: .widget)
    } else {
      self
    }
  }
}

fileprivate func extractRootIdentifier(_ data: Data) -> String? {
  guard let jsonString = String(data: data, encoding: .utf8),
        let json = try? JSONValue.parse(from: jsonString) else {
    return nil
  }

  let root = VoltraNode.parse(from: json)
  if case .element(let element) = root {
    return element.id ?? element.type
  }
  return nil
}

fileprivate func makeDeepLinkURL(_ data: Data, source: String, kind: String) -> URL? {
  guard let scheme = VoltraDeepLinkResolver.deepLinkScheme() else { return nil }
  let tag = extractRootIdentifier(data) ?? "unknown"
  return URL(string: "\(scheme)://voltraui?kind=\(kind)&source=\(source)&tag=\(tag)")
}

fileprivate func resolveStaticDeepLinkURL(_ data: Data, widgetId: String) -> URL? {
  if let raw = VoltraHomeWidgetStore.readDeepLinkUrl(widgetId: widgetId), !raw.isEmpty {
    if raw.contains("://"), let url = URL(string: raw) { return url }
    if let scheme = VoltraDeepLinkResolver.deepLinkScheme() {
      let path = raw.hasPrefix("/") ? raw : "/\(raw)"
      return URL(string: "\(scheme)://\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")
    }
  }
  return makeDeepLinkURL(data, source: "home_widget", kind: "widget")
}

fileprivate func normalizeJsonData(_ data: Data) -> Data? {
  guard let obj = try? JSONSerialization.jsonObject(with: data) else { return nil }

  // If it's already an array, use it as-is
  if obj is [Any] {
    return data
  }

  // If it's a single component (dictionary), wrap it in an array
  if let dict = obj as? [String: Any] {
    guard JSONSerialization.isValidJSONObject([dict]),
          let wrapped = try? JSONSerialization.data(withJSONObject: [dict]) else {
      return nil
    }
    return wrapped
  }

  // Invalid input (string, number, boolean, null) - return nil to indicate error
  return nil
}

