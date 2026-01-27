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

  public static func readTimeline(widgetId: String) -> WidgetTimeline? {
    guard let group = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: group),
          let timelineString = defaults.string(forKey: "Voltra_Widget_Timeline_\(widgetId)"),
          let timelineData = timelineString.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: timelineData) as? [String: Any],
          let entriesJson = json["entries"] as? [[String: Any]]
    else {
      return nil
    }

    let entries = entriesJson.compactMap { entryJson -> WidgetTimelineEntry? in
      guard let timestampNumber = entryJson["date"] as? NSNumber,
            let jsonString = entryJson["json"] as? String,
            let jsonData = jsonString.data(using: .utf8)
      else {
        return nil
      }

      let timestampMs = timestampNumber.doubleValue
      let date = Date(timeIntervalSince1970: timestampMs / 1000.0)
      let deepLinkUrl = entryJson["deepLinkUrl"] as? String

      return WidgetTimelineEntry(date: date, json: jsonData, deepLinkUrl: deepLinkUrl)
    }

    let sortedEntries = entries.sorted { $0.date < $1.date }
    return WidgetTimeline(entries: sortedEntries)
  }

  public static func pruneExpiredEntries(widgetId: String) -> Int {
    guard let group = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: group),
          let timelineString = defaults.string(forKey: "Voltra_Widget_Timeline_\(widgetId)"),
          let timelineData = timelineString.data(using: .utf8),
          var json = try? JSONSerialization.jsonObject(with: timelineData) as? [String: Any],
          let entriesJson = json["entries"] as? [[String: Any]]
    else {
      return 0
    }

    let now = Date()
    let validEntries = entriesJson.filter { entry in
      guard let timestamp = entry["date"] as? NSNumber else { return false }
      let date = Date(timeIntervalSince1970: timestamp.doubleValue / 1000.0)
      return date > now
    }

    let prunedCount = entriesJson.count - validEntries.count
    guard prunedCount > 0 else { return 0 }

    json["entries"] = validEntries
    if let updatedData = try? JSONSerialization.data(withJSONObject: json),
       let updatedString = String(data: updatedData, encoding: .utf8)
    {
      defaults.set(updatedString, forKey: "Voltra_Widget_Timeline_\(widgetId)")
      defaults.synchronize()
      print("[Voltra] Pruned \(prunedCount) expired timeline entries for '\(widgetId)'")
    }

    return prunedCount
  }
}

// Timeline data structures (intermediate storage - still uses Data for flexibility)
public struct WidgetTimelineEntry {
  let date: Date
  let json: Data
  let deepLinkUrl: String?
}

public struct WidgetTimeline {
  let entries: [WidgetTimelineEntry]
}

// MARK: - Timeline + entries

/// The entry holds a pre-parsed VoltraNode (AST) instead of raw JSON.
public struct VoltraHomeWidgetEntry: TimelineEntry, Equatable {
  public let date: Date
  public let rootNode: VoltraNode?
  public let widgetId: String
  public let deepLinkUrl: String?

  public init(date: Date, rootNode: VoltraNode?, widgetId: String, deepLinkUrl: String? = nil) {
    self.date = date
    self.rootNode = rootNode
    self.widgetId = widgetId
    self.deepLinkUrl = deepLinkUrl
  }

  public static func == (lhs: VoltraHomeWidgetEntry, rhs: VoltraHomeWidgetEntry) -> Bool {
    // VoltraNode is Hashable, so this comparison works correctly.
    // If the parsed AST is different, entries are not equal → WidgetKit re-renders.
    lhs.date == rhs.date &&
      lhs.rootNode == rhs.rootNode &&
      lhs.widgetId == rhs.widgetId &&
      lhs.deepLinkUrl == rhs.deepLinkUrl
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
    VoltraHomeWidgetEntry(date: Date(), rootNode: nil, widgetId: widgetId)
  }

  public func getSnapshot(in context: Context, completion: @escaping (VoltraHomeWidgetEntry) -> Void) {
    // Prioritize timeline data for consistency with getTimeline
    if let timeline = VoltraHomeWidgetStore.readTimeline(widgetId: widgetId),
       let firstEntry = timeline.entries.first
    {
      let node = parseJsonToNode(data: firstEntry.json, family: context.family)
      completion(VoltraHomeWidgetEntry(
        date: Date(),
        rootNode: node,
        widgetId: widgetId,
        deepLinkUrl: firstEntry.deepLinkUrl
      ))
      return
    }

    // Fallback to single-entry data
    let data = VoltraHomeWidgetStore.readJson(widgetId: widgetId) ?? initialState
    let node = data.flatMap { parseJsonToNode(data: $0, family: context.family) }
    completion(VoltraHomeWidgetEntry(date: Date(), rootNode: node, widgetId: widgetId))
  }

  public func getTimeline(in context: Context, completion: @escaping (Timeline<VoltraHomeWidgetEntry>) -> Void) {
    // Prune expired timeline entries if any exist
    VoltraHomeWidgetStore.pruneExpiredEntries(widgetId: widgetId)

    if let timeline = VoltraHomeWidgetStore.readTimeline(widgetId: widgetId), !timeline.entries.isEmpty {
      let entries = timeline.entries.map { timelineEntry in
        let node = parseJsonToNode(data: timelineEntry.json, family: context.family)
        return VoltraHomeWidgetEntry(
          date: timelineEntry.date,
          rootNode: node,
          widgetId: widgetId,
          deepLinkUrl: timelineEntry.deepLinkUrl
        )
      }
      completion(Timeline(entries: entries, policy: .never))
      return
    }

    // Fallback to single-entry behavior
    let data = VoltraHomeWidgetStore.readJson(widgetId: widgetId) ?? initialState
    let node = data.flatMap { parseJsonToNode(data: $0, family: context.family) }
    let entry = VoltraHomeWidgetEntry(date: Date(), rootNode: node, widgetId: widgetId)
    completion(Timeline(entries: [entry], policy: .never))
  }

  /// Parse JSON data into a VoltraNode for the given widget family.
  /// This moves all parsing work to the Provider (background thread).
  private func parseJsonToNode(data: Data, family: WidgetFamily) -> VoltraNode? {
    // 1. Select content for the target family
    let selectedData = selectContentForFamily(data, family: family)

    // 2. Normalize the JSON
    guard let normalized = normalizeJsonData(selectedData),
          let jsonString = String(data: normalized, encoding: .utf8),
          let json = try? JSONValue.parse(from: jsonString)
    else {
      return nil
    }

    // 3. Parse into VoltraNode AST
    return VoltraNode.parse(from: json)
  }
}

public struct VoltraHomeWidgetView: View {
  public var entry: VoltraHomeWidgetEntry

  public init(entry: VoltraHomeWidgetEntry) {
    self.entry = entry
  }

  public var body: some View {
    Group {
      if let root = entry.rootNode {
        // No parsing here - just render the pre-parsed AST
        Voltra(root: root, activityId: "widget")
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .widgetURL(resolveDeepLinkURL(entry))
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

// MARK: - Deep link helpers

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

private func resolveDeepLinkURL(_ entry: VoltraHomeWidgetEntry) -> URL? {
  // Prefer the timeline entry's deep link URL if available
  if let entryUrl = entry.deepLinkUrl, !entryUrl.isEmpty {
    if entryUrl.contains("://"), let url = URL(string: entryUrl) { return url }
    if let scheme = VoltraDeepLinkResolver.deepLinkScheme() {
      let path = entryUrl.hasPrefix("/") ? entryUrl : "/\(entryUrl)"
      return URL(string: "\(scheme)://\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")
    }
  }

  // Fallback to static deep link URL from UserDefaults
  if let raw = VoltraHomeWidgetStore.readDeepLinkUrl(widgetId: entry.widgetId), !raw.isEmpty {
    if raw.contains("://"), let url = URL(string: raw) { return url }
    if let scheme = VoltraDeepLinkResolver.deepLinkScheme() {
      let path = raw.hasPrefix("/") ? raw : "/\(raw)"
      return URL(string: "\(scheme)://\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")
    }
  }

  // Default deep link with widget info
  guard let scheme = VoltraDeepLinkResolver.deepLinkScheme() else { return nil }

  var tag = "unknown"
  if let root = entry.rootNode, case let .element(element) = root {
    tag = element.id ?? element.type
  }

  return URL(string: "\(scheme)://voltraui?kind=widget&source=home_widget&tag=\(tag)")
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
