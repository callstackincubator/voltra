import Foundation

/// Identifies one rendered placement: a widget, one placement's configuration (the instance key of
/// ADR 0007; nil when the widget has none), one family and one appearance. iOS gives a placement no
/// id of its own, so the instance key is the nearest thing to one.
///
/// WidgetKit runs the View body once per family, color scheme and rendering mode, and the widget
/// can draw a different tree for each, so `appearance` is part of the key: without it those
/// renders would overwrite one file and a failure could show another appearance's snapshot. Both
/// the last good render and the failure log's recovery tracking use this key.
public struct DynamicWidgetRenderKey: Hashable {
  public let widgetId: String
  public let instance: String?
  public let family: String
  /// Color scheme, rendering mode and whether the container background shows: the three
  /// appearance values `render()` is given, joined into one component.
  public let appearance: String

  public init(widgetId: String, instance: String?, family: String, appearance: String) {
    self.widgetId = widgetId
    self.instance = instance
    self.family = family
    self.appearance = appearance
  }
}

/// The resolved node JSON of the last render that succeeded, per `DynamicWidgetRenderKey`, kept
/// in the App Group so a release widget does not fall back to the build-time placeholder after one
/// bad props update, locale change or resize (ADR 0013 §5).
///
/// One file per key, written atomically. `write` is skipped when the output is what this process
/// wrote last and the file is still there, because recompositions mostly produce the same tree.
/// A node over `maxBytes` is not stored and does not evict the older one.
public final class DynamicWidgetLastGoodStore {
  public static let maxBytes = 256 * 1024
  static let directoryName = "VoltraDynamicWidgetLastGood"

  /// The App Group's store, or nil when no group is configured.
  public static var shared: DynamicWidgetLastGoodStore? {
    guard
      let group = VoltraConfig.groupIdentifier(),
      let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else {
      return nil
    }
    return DynamicWidgetLastGoodStore(directoryURL: container.appendingPathComponent(directoryName, isDirectory: true))
  }

  private static let lock = NSLock()
  private static var lastWrittenHash: [String: Int] = [:]

  private let directoryURL: URL
  private let fileManager: FileManager

  public init(directoryURL: URL, fileManager: FileManager = .default) {
    self.directoryURL = directoryURL
    self.fileManager = fileManager
  }

  @discardableResult
  public func write(_ nodeJSON: String, for key: DynamicWidgetRenderKey) -> Bool {
    let data = Data(nodeJSON.utf8)
    guard data.count <= Self.maxBytes else { return false }

    let url = fileURL(for: key)
    let hash = nodeJSON.hashValue
    let slot = url.path

    Self.lock.lock()
    defer { Self.lock.unlock() }

    if Self.lastWrittenHash[slot] == hash, fileManager.fileExists(atPath: slot) {
      return true
    }
    do {
      try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
      try data.write(to: url, options: .atomic)
      Self.lastWrittenHash[slot] = hash
      return true
    } catch {
      VoltraLogger.widget.error("[DynamicWidget] last good write failed widgetId=\(key.widgetId, privacy: .public): \(error.localizedDescription, privacy: .public)")
      return false
    }
  }

  public func read(_ key: DynamicWidgetRenderKey) -> String? {
    guard let data = try? Data(contentsOf: fileURL(for: key)) else { return nil }
    return String(data: data, encoding: .utf8)
  }

  /// Removes every instance and family of one widget. Content the app cleared must not be
  /// resurrected by a later failure.
  public func remove(widgetId: String) {
    let prefix = Self.encode(widgetId) + "__"
    let names = (try? fileManager.contentsOfDirectory(atPath: directoryURL.path)) ?? []

    Self.lock.lock()
    defer { Self.lock.unlock() }

    for name in names where name.hasPrefix(prefix) {
      let url = directoryURL.appendingPathComponent(name)
      try? fileManager.removeItem(at: url)
      Self.lastWrittenHash.removeValue(forKey: url.path)
    }
  }

  private func fileURL(for key: DynamicWidgetRenderKey) -> URL {
    let name = [Self.encode(key.widgetId), Self.encode(key.instance ?? "-"), Self.encode(key.family), Self.encode(key.appearance)]
      .joined(separator: "__")
    return directoryURL.appendingPathComponent(name + ".json")
  }

  /// Percent-encodes everything but letters, digits and `-`, so `__` can only be the separator.
  private static func encode(_ value: String) -> String {
    var allowed = CharacterSet.alphanumerics
    allowed.insert("-")
    return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
  }
}
