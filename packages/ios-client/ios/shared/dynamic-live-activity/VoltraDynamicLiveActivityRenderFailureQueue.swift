import Foundation

/// The intentionally minimal diagnostic record sent from the widget extension
/// to the app after a Dynamic Live Activity definition cannot be rendered.
/// Do not add props, tokens, stages, or arbitrary error details here.
public struct VoltraDynamicLiveActivityRenderFailure: Codable, Equatable {
  public static let eventType = "dynamicLiveActivityRenderFailed"

  public let type: String
  public let source: String
  public let timestamp: TimeInterval
  public let activityName: String
  public let definitionId: String
  public let message: String

  public init(activityName: String, definitionId: String, message: String, timestamp: Date = Date()) {
    type = Self.eventType
    source = activityName
    self.timestamp = timestamp.timeIntervalSince1970
    self.activityName = activityName
    self.definitionId = definitionId
    self.message = Self.sanitize(message)
  }

  public var dictionary: [String: Any] {
    [
      "type": type,
      "source": source,
      "timestamp": timestamp,
      "activityName": activityName,
      "definitionId": definitionId,
      "message": message,
    ]
  }

  /// Error descriptions can contain line breaks and unbounded implementation
  /// details. Keep the diagnostic useful while making the persisted contract
  /// predictable and safe to expose to JavaScript.
  public static func sanitize(_ message: String) -> String {
    let collapsed = message
      .components(separatedBy: .whitespacesAndNewlines)
      .filter { !$0.isEmpty }
      .joined(separator: " ")
    let fallback = "Dynamic Live Activity rendering failed."
    return String((collapsed.isEmpty ? fallback : collapsed).prefix(500))
  }
}

public protocol VoltraDynamicLiveActivityRenderFailureStorage {
  func load() throws -> [VoltraDynamicLiveActivityRenderFailure]
  func save(_ failures: [VoltraDynamicLiveActivityRenderFailure]) throws
}

/// A dedicated, bounded queue. Its lock makes draining and appending atomic in
/// a process: a failure recorded while a drain is in progress remains queued
/// for the next drain rather than being cleared accidentally.
public final class VoltraDynamicLiveActivityRenderFailureQueue {
  public static let capacity = 100

  private let storage: VoltraDynamicLiveActivityRenderFailureStorage
  private let lock = NSLock()

  public init(storage: VoltraDynamicLiveActivityRenderFailureStorage) {
    self.storage = storage
  }

  @discardableResult
  public func record(_ failure: VoltraDynamicLiveActivityRenderFailure) -> Bool {
    lock.lock()
    defer { lock.unlock() }

    do {
      var failures = try storage.load()
      failures.append(failure)
      if failures.count > Self.capacity {
        failures.removeFirst(failures.count - Self.capacity)
      }
      try storage.save(failures)
      return true
    } catch {
      return false
    }
  }

  public func drain() -> [VoltraDynamicLiveActivityRenderFailure] {
    lock.lock()
    defer { lock.unlock() }

    do {
      let failures = try storage.load()
      try storage.save([])
      return failures
    } catch {
      return []
    }
  }
}
