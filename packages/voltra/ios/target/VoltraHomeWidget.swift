//
//  VoltraHomeWidget.swift
//
//  Generic home screen widget infrastructure for Voltra.
//  Widget definitions are generated dynamically by the config plugin.
//

import Foundation
import os
import SwiftUI
import WidgetKit

// MARK: - Shared storage helpers

public enum VoltraHomeWidgetStore {
  public static func readJson(widgetId: String) -> Data? {
    VoltraWidgetDefaults.widgetJson(for: widgetId).flatMap { $0.data(using: .utf8) }
  }

  public static func readDeepLinkUrl(widgetId: String) -> String? {
    VoltraWidgetDefaults.deepLinkUrl(for: widgetId)
  }

  public static func readTimeline(widgetId: String) -> WidgetTimeline? {
    guard let timelineString = VoltraWidgetDefaults.timelineString(for: widgetId),
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
    guard let timelineString = VoltraWidgetDefaults.timelineString(for: widgetId),
          let timelineData = timelineString.data(using: .utf8),
          var json = try? JSONSerialization.jsonObject(with: timelineData) as? [String: Any],
          let entriesJson = json["entries"] as? [[String: Any]]
    else {
      return 0
    }

    let now = Date()
    let parsedEntries: [(date: Date, json: [String: Any])] = entriesJson.compactMap { entry in
      guard let timestamp = entry["date"] as? NSNumber else { return nil }
      let date = Date(timeIntervalSince1970: timestamp.doubleValue / 1000.0)
      return (date: date, json: entry)
    }

    // Keep all future entries, plus the most recent past entry (current state).
    let pastEntries = parsedEntries.filter { $0.date <= now }.sorted { $0.date < $1.date }
    let latestPastEntry = pastEntries.last?.json
    let futureEntries = parsedEntries.filter { $0.date > now }.map(\.json)

    var validEntries = futureEntries
    if let latestPastEntry {
      validEntries.insert(latestPastEntry, at: 0)
    }

    let prunedCount = entriesJson.count - validEntries.count
    guard prunedCount > 0 else { return 0 }

    json["entries"] = validEntries
    if let updatedData = try? JSONSerialization.data(withJSONObject: json),
       let updatedString = String(data: updatedData, encoding: .utf8)
    {
      try? VoltraWidgetDefaults.setTimeline(updatedString, for: widgetId)
      VoltraLogger.widget.debug("Pruned \(prunedCount) expired timeline entries for '\(widgetId)'")
    }

    return prunedCount
  }
}

/// Timeline data structures (intermediate storage - still uses Data for flexibility)
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

    // Check if server-driven updates are configured for this widget
    if VoltraWidgetServerFetcher.serverUrl(for: widgetId) != nil {
      getServerDrivenTimeline(in: context, completion: completion)
      return
    }

    // Local-only mode: use existing data from UserDefaults
    getLocalTimeline(in: context, completion: completion)
  }

  // MARK: - Server-Driven Timeline

  private static var lastFetchTimes: [String: Date] = [:]
  private static let coalesceInterval: TimeInterval = 3 // seconds

  /// Fetch widget content from a remote Voltra SSR server and build a timeline.
  private func getServerDrivenTimeline(in context: Context, completion: @escaping (Timeline<VoltraHomeWidgetEntry>) -> Void) {
    let familyKey = familyToKey(context.family)
    let intervalMinutes = VoltraWidgetServerFetcher.updateInterval(for: widgetId)

    // Coalesce: if we fetched for this widget very recently, use cached data.
    // The server returns all families in every response, so subsequent getTimeline
    // calls for different families can safely use the just-cached response —
    // selectContentForFamily will pick the correct family-specific content.
    if let lastFetch = Self.lastFetchTimes[widgetId],
       Date().timeIntervalSince(lastFetch) < Self.coalesceInterval
    {
      VoltraLogger.widget.info("Coalescing fetch for '\(widgetId)' family '\(familyKey)' (last fetch \(Date().timeIntervalSince(lastFetch))s ago)")
      getLocalTimeline(in: context, completion: completion)
      return
    }

    Task {
      do {
        let data = try await VoltraWidgetServerFetcher.fetchWidgetContent(
          widgetId: widgetId,
          family: familyKey
        )

        // Record that we just fetched successfully
        Self.lastFetchTimes[widgetId] = Date()

        let node = parseJsonToNode(data: data, family: context.family)

        // Only cache the data after successful parsing to avoid overwriting
        // good cached content with unparseable responses
        if node != nil, let jsonString = String(data: data, encoding: .utf8) {
          try? VoltraWidgetDefaults.setWidgetJson(jsonString, for: widgetId, deepLinkUrl: nil)
        }

        let entry = VoltraHomeWidgetEntry(date: Date(), rootNode: node, widgetId: widgetId)

        // Schedule next update based on configured interval
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: intervalMinutes, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))

        VoltraLogger.widget.info("Server-driven update succeeded for '\(widgetId)', next update in \(intervalMinutes)m")
      } catch {
        VoltraLogger.widget.error("Server-driven update failed for '\(widgetId)': \(error.localizedDescription)")

        // Fall back to local data on network failure
        getLocalTimeline(in: context, completion: completion)
      }
    }
  }

  // MARK: - Local Timeline

  /// Build a timeline from locally stored data (UserDefaults / initial state).
  private func getLocalTimeline(in context: Context, completion: @escaping (Timeline<VoltraHomeWidgetEntry>) -> Void) {
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

    // If server updates are configured but we're in fallback, retry sooner
    if VoltraWidgetServerFetcher.serverUrl(for: widgetId) != nil {
      let retryDate = Date().addingTimeInterval(900) // Retry in 15 minutes
      completion(Timeline(entries: [entry], policy: .after(retryDate)))
    } else {
      completion(Timeline(entries: [entry], policy: .never))
    }
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

  @Environment(\.showsWidgetContainerBackground) private var showsWidgetContainerBackground
  @Environment(\.widgetRenderingMode) private var widgetRenderingMode

  public init(entry: VoltraHomeWidgetEntry) {
    self.entry = entry
  }

  private var showRefreshButton: Bool {
    VoltraWidgetServerFetcher.isRefreshEnabled(for: entry.widgetId)
  }

  public var body: some View {
    let mappedRenderingMode = mapWidgetRenderingMode(widgetRenderingMode)

    Group {
      if let root = entry.rootNode {
        // No parsing here - just render the pre-parsed AST
        let content = Voltra(
          root: root,
          activityId: "widget",
          widget: VoltraWidgetEnvironment(
            isHomeScreenWidget: true,
            renderingMode: mappedRenderingMode,
            showsContainerBackground: showsWidgetContainerBackground
          )
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(resolveDeepLinkURL(entry))

        if showRefreshButton {
          content.overlay(alignment: .topTrailing) {
            refreshButton
          }
        } else {
          content
        }
      } else {
        placeholderView(widgetId: entry.widgetId)
      }
    }
    .disableWidgetMarginsIfAvailable()
  }

  private func mapWidgetRenderingMode(_ mode: WidgetRenderingMode) -> VoltraWidgetRenderingMode {
    switch mode {
    case .fullColor:
      return .fullColor
    case .accented:
      return .accented
    case .vibrant:
      return .vibrant
    default:
      return .unknown
    }
  }

  @ViewBuilder
  private var refreshButton: some View {
    if #available(iOSApplicationExtension 17.0, *) {
      Button(intent: VoltraRefreshIntent(widgetId: entry.widgetId)) {
        Image(systemName: "arrow.clockwise")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(.secondary)
          .padding(6)
          .background(.ultraThinMaterial, in: Circle())
      }
      .buttonStyle(.plain)
      .padding(12)
    }
  }

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
