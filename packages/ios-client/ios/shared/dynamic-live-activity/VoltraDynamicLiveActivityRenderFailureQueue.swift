import Foundation

#if canImport(Darwin)
  import Darwin
#else
  import Glibc
#endif

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
  func append(_ failure: VoltraDynamicLiveActivityRenderFailure, capacity: Int) throws
  func drain() throws -> [VoltraDynamicLiveActivityRenderFailure]
}

/// Cross-process-safe file storage for the dedicated failure queue.
///
/// The app and widget extension take an advisory lock on the same App Group
/// lock file before every read/modify/write transaction. Atomic replacement of
/// the JSON data file prevents partial writes. Corrupt data is quarantined and
/// treated as an empty queue so one damaged record cannot permanently disable
/// diagnostics.
public final class VoltraDynamicLiveActivityRenderFailureFileStorage: VoltraDynamicLiveActivityRenderFailureStorage {
  private let directoryURL: URL
  private let fileManager: FileManager
  private let queueFileName = "dynamic-live-activity-render-failures-v1.json"
  private let lockFileName = "dynamic-live-activity-render-failures-v1.lock"

  public init(directoryURL: URL, fileManager: FileManager = .default) {
    self.directoryURL = directoryURL
    self.fileManager = fileManager
  }

  public func append(_ failure: VoltraDynamicLiveActivityRenderFailure, capacity: Int) throws {
    try withExclusiveAccess { queueURL in
      var failures = loadRecoveringCorruption(from: queueURL)
      failures.append(failure)
      if failures.count > capacity {
        failures.removeFirst(failures.count - capacity)
      }
      try write(failures, to: queueURL)
    }
  }

  public func drain() throws -> [VoltraDynamicLiveActivityRenderFailure] {
    try withExclusiveAccess { queueURL in
      let failures = loadRecoveringCorruption(from: queueURL)
      try write([], to: queueURL)
      return failures
    }
  }

  private func withExclusiveAccess<Result>(
    _ operation: (URL) throws -> Result
  ) throws -> Result {
    try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
    let lockURL = directoryURL.appendingPathComponent(lockFileName, isDirectory: false)
    let descriptor = open(lockURL.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { throw POSIXError(.EIO) }
    defer { close(descriptor) }
    guard flock(descriptor, LOCK_EX) == 0 else { throw POSIXError(.EIO) }
    defer { flock(descriptor, LOCK_UN) }
    return try operation(directoryURL.appendingPathComponent(queueFileName, isDirectory: false))
  }

  private func loadRecoveringCorruption(from url: URL) -> [VoltraDynamicLiveActivityRenderFailure] {
    guard fileManager.fileExists(atPath: url.path) else { return [] }
    do {
      return try JSONDecoder().decode(
        [VoltraDynamicLiveActivityRenderFailure].self,
        from: Data(contentsOf: url)
      )
    } catch {
      let quarantineURL = directoryURL.appendingPathComponent(
        "\(queueFileName).corrupt-\(UUID().uuidString)",
        isDirectory: false
      )
      try? fileManager.moveItem(at: url, to: quarantineURL)
      return []
    }
  }

  private func write(_ failures: [VoltraDynamicLiveActivityRenderFailure], to url: URL) throws {
    try JSONEncoder().encode(failures).write(to: url, options: .atomic)
  }
}

/// A dedicated, bounded queue whose storage owns the append/drain transaction.
public final class VoltraDynamicLiveActivityRenderFailureQueue {
  public static let capacity = 100

  private let storage: VoltraDynamicLiveActivityRenderFailureStorage
  public init(storage: VoltraDynamicLiveActivityRenderFailureStorage) {
    self.storage = storage
  }

  @discardableResult
  public func record(_ failure: VoltraDynamicLiveActivityRenderFailure) -> Bool {
    do {
      try storage.append(failure, capacity: Self.capacity)
      return true
    } catch {
      return false
    }
  }

  public func drain() -> [VoltraDynamicLiveActivityRenderFailure] {
    do {
      return try storage.drain()
    } catch {
      return []
    }
  }
}
