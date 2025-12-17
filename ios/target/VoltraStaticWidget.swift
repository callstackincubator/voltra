//
//  VoltraUIStaticWidget.swift
//

import SwiftUI
import WidgetKit
import Foundation

// MARK: - Shared storage helpers

fileprivate enum StaticWidgetStore {
  static func groupIdentifier() -> String? {
    Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String
  }

  static func readJson(key: String) -> Data? {
    guard let group = groupIdentifier(),
          let defaults = UserDefaults(suiteName: group),
          let jsonString = defaults.string(forKey: "Voltra_Widget_JSON_\(key)")
    else { return nil }
    return jsonString.data(using: .utf8)
  }

  static func readDeepLinkUrl(key: String) -> String? {
    guard let group = groupIdentifier(),
          let defaults = UserDefaults(suiteName: group) else { return nil }
    return defaults.string(forKey: "Voltra_Widget_DeepLinkURL_\(key)")
  }
}

// MARK: - Timeline + entries

struct VoltraSlotEntry: TimelineEntry {
  let date: Date
  let json: Data?
  let slotId: String
}

struct VoltraSlotProvider: TimelineProvider {
  let slotId: String

  func placeholder(in context: Context) -> VoltraSlotEntry {
    VoltraSlotEntry(date: Date(), json: nil, slotId: slotId)
  }

  func getSnapshot(in context: Context, completion: @escaping (VoltraSlotEntry) -> Void) {
    let data = StaticWidgetStore.readJson(key: slotId)
    completion(VoltraSlotEntry(date: Date(), json: data, slotId: slotId))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<VoltraSlotEntry>) -> Void) {
    let data = StaticWidgetStore.readJson(key: slotId)
    let entry = VoltraSlotEntry(date: Date(), json: data, slotId: slotId)
    completion(Timeline(entries: [entry], policy: .never))
  }
}

struct VoltraSlotWidgetView: View {
  var entry: VoltraSlotEntry

  var body: some View {
    Group {
      if let data = entry.json {
        let selected = selectLockScreenJson(data)
        buildStaticContentView(data: selected, source: "static_widget")
          .widgetURL(resolveStaticDeepLinkURL(selected, key: entry.slotId))
      } else {
        placeholderView(slotId: entry.slotId)
      }
    }
    .disableWidgetMarginsIfAvailable()
  }

  @ViewBuilder
  private func placeholderView(slotId: String) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Almost ready")
        .font(.headline)
      Text("Open the app once to sync data for \(slotDisplayLabel(for: slotId)).")
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

  private func slotDisplayLabel(for slotId: String) -> String {
    switch slotId {
    case "1": return "Slot 1"
    case "2": return "Slot 2"
    case "3": return "Slot 3"
    default: return "this widget"
    }
  }
}

// MARK: - Widget definitions

public struct VoltraSlotWidget1: Widget {
  private let slotId = "1"

  public init() {}
  
  public var body: some WidgetConfiguration {
    StaticConfiguration(kind: "VoltraWidgetSlot1", provider: VoltraSlotProvider(slotId: slotId)) { entry in
      VoltraSlotWidgetView(entry: entry)
    }
    .configurationDisplayName("Voltra Widget — Slot 1")
    .description("Displays data synced to widget slot 1.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

public struct VoltraSlotWidget2: Widget {
  private let slotId = "2"

  public init() {}
  
  public var body: some WidgetConfiguration {
    StaticConfiguration(kind: "VoltraWidgetSlot2", provider: VoltraSlotProvider(slotId: slotId)) { entry in
      VoltraSlotWidgetView(entry: entry)
    }
    .configurationDisplayName("Voltra Widget — Slot 2")
    .description("Displays data synced to widget slot 2.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

public struct VoltraSlotWidget3: Widget {
  private let slotId = "3"

  public init() {}
  
  public var body: some WidgetConfiguration {
    StaticConfiguration(kind: "VoltraWidgetSlot3", provider: VoltraSlotProvider(slotId: slotId)) { entry in
      VoltraSlotWidgetView(entry: entry)
    }
    .configurationDisplayName("Voltra Widget — Slot 3")
    .description("Displays data synced to widget slot 3.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

// MARK: - Deep link + rendering helpers (borrowed from previous implementation)

fileprivate func buildStaticContentView(data: Data, source: String) -> AnyView {
  let normalized = normalizeJsonData(data) ?? (try? JSONSerialization.data(withJSONObject: [])) ?? Data("[]".utf8)
  let sanitized = sanitizeWidgetJson(normalized)

  guard let jsonString = String(data: sanitized, encoding: .utf8),
        let json = try? JSONValue.parse(from: jsonString) else {
    return AnyView(
      Text("Failed to render widget")
        .font(.caption)
        .foregroundStyle(.secondary)
    )
  }

  let root = parseVoltraNode(from: json)

  return AnyView(
    Voltra(root: root, activityId: "widget").frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  )

}

/// Parse a VoltraNode from JSON, extracting stylesheet and sharedElements if present
fileprivate func parseVoltraNode(from json: JSONValue) -> VoltraNode {
  // Extract stylesheet and sharedElements from root if it's an object
  var stylesheet: [[String: JSONValue]]? = nil
  var sharedElements: [JSONValue]? = nil

  if case .object(let rootObject) = json {
    // Extract stylesheet (key "s")
    if case .array(let stylesheetArray) = rootObject["s"] {
      stylesheet = stylesheetArray.compactMap { item in
        if case .object(let dict) = item { return dict }
        return nil
      }
    }
    // Extract shared elements (key "e")
    if case .array(let elementsArray) = rootObject["e"] {
      sharedElements = elementsArray
    }
  }

  return VoltraNode(from: json, stylesheet: stylesheet, sharedElements: sharedElements)
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

fileprivate func deepLinkScheme() -> String? {
  if let types = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] {
    for t in types {
      if let schemes = t["CFBundleURLSchemes"] as? [String], let s = schemes.first, !s.isEmpty {
        return s
      }
    }
  }
  return Bundle.main.bundleIdentifier
}

fileprivate func extractRootIdentifier(_ data: Data) -> String? {
  guard let jsonString = String(data: data, encoding: .utf8),
        let json = try? JSONValue.parse(from: jsonString) else {
    return nil
  }

  let root = parseVoltraNode(from: json)
  if case .element(let element) = root {
    return element.id ?? element.type
  }
  return nil
}

fileprivate func makeDeepLinkURL(_ data: Data, source: String, kind: String) -> URL? {
  guard let scheme = deepLinkScheme() else { return nil }
  let tag = extractRootIdentifier(data) ?? "unknown"
  return URL(string: "\(scheme)://voltraui?kind=\(kind)&source=\(source)&tag=\(tag)")
}

fileprivate func resolveStaticDeepLinkURL(_ data: Data, key: String) -> URL? {
  if let raw = StaticWidgetStore.readDeepLinkUrl(key: key), !raw.isEmpty {
    if raw.contains("://"), let url = URL(string: raw) { return url }
    if let scheme = deepLinkScheme() {
      let path = raw.hasPrefix("/") ? raw : "/\(raw)"
      return URL(string: "\(scheme)://\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")
    }
  }
  return makeDeepLinkURL(data, source: "static_widget", kind: "widget")
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

fileprivate func sanitizeWidgetJson(_ data: Data) -> Data {
  guard let root = try? JSONSerialization.jsonObject(with: data) else { return data }

  func sanitizeNode(_ node: Any) -> Any? {
    if let arr = node as? [Any] {
      return arr.compactMap { sanitizeNode($0) }
    }
    if var dict = node as? [String: Any] {
      // Component type is now a numeric ID - convert to component name
      var type: String = ""
      if let typeID = dict["t"] as? Int, let componentTypeID = ComponentTypeID(rawValue: typeID) {
        type = componentTypeID.componentName
      } else if let typeString = dict["t"] as? String {
        type = typeString
      } else if let typeString = dict["type"] as? String {
        type = typeString
      }
      
      let allowedContainers: Set<String> = ["VStack", "HStack", "ZStack", "ScrollView", "List", "Form", "GroupBox", "DisclosureGroup"]
      let allowedLeaves: Set<String> = ["Text", "Label", "Image", "Divider", "Spacer"]

      switch type {
      case "Button":
        // Convert component name back to ID for serialization
        let textID = ComponentTypeID(componentName: "Text")?.rawValue ?? 0
        var new: [String: Any] = ["t": textID]
        if let t = dict["title"] as? String { new["title"] = t }
        if let id = dict["identifier"] as? String { new["identifier"] = id }
        if let mods = dict["modifiers"] { new["modifiers"] = mods }
        return new

      case "Toggle", "Slider", "TextField", "SecureField", "TextEditor", "Picker":
        return nil

      case _ where allowedLeaves.contains(type):
        // Ensure t field is numeric ID if it was converted from string
        if dict["t"] as? String != nil, let componentTypeID = ComponentTypeID(componentName: type) {
          dict["t"] = componentTypeID.rawValue
        }
        return dict

      case _ where allowedContainers.contains(type):
        // Ensure t field is numeric ID if it was converted from string
        if dict["t"] as? String != nil, let componentTypeID = ComponentTypeID(componentName: type) {
          dict["t"] = componentTypeID.rawValue
        }
        if let children = (dict["c"] as? [Any]) ?? (dict["children"] as? [Any]) {
          dict["c"] = children.compactMap { sanitizeNode($0) }
          dict.removeValue(forKey: "children")
        }
        return dict

      default:
        return nil
      }
    }
    return nil
  }

  let sanitized = sanitizeNode(root) ?? []
  let topLevel: Any
  if let arr = sanitized as? [Any] {
    topLevel = arr
  } else if let dict = sanitized as? [String: Any] {
    topLevel = [dict]
  } else {
    topLevel = []
  }

  if JSONSerialization.isValidJSONObject(topLevel),
     let data = try? JSONSerialization.data(withJSONObject: topLevel) {
    return data
  }
  return data
}

fileprivate func extract(_ root: [String: Any], path: [String]) -> Any? {
  var cursor: Any? = root
  for key in path {
    guard let dict = cursor as? [String: Any] else { return nil }
    cursor = dict[key]
  }
  return cursor
}

fileprivate func fragmentToArrayData(_ fragment: Any) -> Data? {
  if let arr = fragment as? [Any], JSONSerialization.isValidJSONObject(arr) {
    return try? JSONSerialization.data(withJSONObject: arr)
  }
  if let dict = fragment as? [String: Any] {
    // Component type is now a numeric ID, not a string - just check it exists
    guard dict["t"] != nil else { return nil }
    if JSONSerialization.isValidJSONObject([dict]) {
      return try? JSONSerialization.data(withJSONObject: [dict])
    }
  }
  return nil
}

fileprivate func selectLockScreenJson(_ data: Data) -> Data {
  guard let root = try? JSONSerialization.jsonObject(with: data) else {
    return normalizeJsonData(data) ?? (try? JSONSerialization.data(withJSONObject: [])) ?? Data("[]".utf8)
  }
  if root is [Any] { return normalizeJsonData(data) ?? (try? JSONSerialization.data(withJSONObject: [])) ?? Data("[]".utf8) }
  guard let dict = root as? [String: Any] else { return normalizeJsonData(data) ?? (try? JSONSerialization.data(withJSONObject: [])) ?? Data("[]".utf8) }

  // Check flattened variant keys
  let keys = ["ls", "isl_exp_c", "isl_exp_l", "isl_exp_t", "isl_exp_b", "isl_cmp_l", "isl_cmp_t", "isl_min"]
  
  for key in keys {
    if let frag = dict[key], let d = fragmentToArrayData(frag) {
      return d
    }
  }
  return normalizeJsonData(data) ?? (try? JSONSerialization.data(withJSONObject: [])) ?? Data("[]".utf8)
}
