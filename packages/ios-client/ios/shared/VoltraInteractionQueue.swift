import Foundation

#if canImport(Darwin)
  import Darwin
#else
  import Glibc
#endif

/// One button or toggle tap, as JavaScript receives it from `popInteractions`.
public struct VoltraInteraction: Codable, Equatable {
  public static let eventType = "interaction"

  public let type: String
  /// Stable for the lifetime of the entry, so a consumer can tell two equal taps apart.
  public let id: String
  public let source: String
  /// Seconds since 1970, like every other Voltra event.
  public let timestamp: TimeInterval
  public let identifier: String
  public let payload: String

  public init(
    source: String,
    identifier: String,
    payload: String?,
    id: String = UUID().uuidString,
    timestamp: Date = Date()
  ) {
    type = Self.eventType
    self.id = id
    self.source = source
    self.timestamp = timestamp.timeIntervalSince1970
    self.identifier = identifier
    self.payload = payload ?? ""
  }

  /// Rebuilds a tap JavaScript hands back; nil when a required field is missing.
  public init?(dictionary: [String: Any]) {
    guard
      let id = dictionary["id"] as? String,
      let source = dictionary["source"] as? String,
      let timestamp = (dictionary["timestamp"] as? NSNumber)?.doubleValue,
      let identifier = dictionary["identifier"] as? String
    else { return nil }
    type = Self.eventType
    self.id = id
    self.source = source
    self.timestamp = timestamp
    self.identifier = identifier
    payload = dictionary["payload"] as? String ?? ""
  }

  public var dictionary: [String: Any] {
    [
      "type": type,
      "id": id,
      "source": source,
      "timestamp": timestamp,
      "identifier": identifier,
      "payload": payload,
    ]
  }
}

public protocol VoltraInteractionStorage {
  /// Runs `body` on the stored entries as one transaction that excludes every other process and
  /// thread using the same storage, and stores what `body` leaves in the array.
  func update<Result>(_ body: (inout [VoltraInteraction]) throws -> Result) throws -> Result
}

/// Cross-process-safe file storage, shared by the app and its extensions through the App Group.
///
/// Every read/modify/write holds an advisory `flock` on a lock file next to the data, and the data
/// file is replaced atomically. Data that cannot be decoded is moved aside to a single quarantine
/// file and treated as an empty queue; a file that cannot be read (for example while the device is
/// locked) aborts the transaction and is left untouched.
public final class VoltraInteractionFileStorage: VoltraInteractionStorage {
  private let directoryURL: URL
  private let fileManager: FileManager
  private let lockTimeout: TimeInterval
  static let queueFileName = "interactions-v1.json"
  static let quarantineFileName = "interactions-v1.json.corrupt"
  private let lockFileName = "interactions-v1.lock"

  /// - Parameter lockTimeout: how long to wait for another process's transaction. `popInteractions`
  ///   runs on the JavaScript thread, so this never blocks indefinitely; on timeout the transaction
  ///   fails and the entries stay where they are.
  public init(directoryURL: URL, fileManager: FileManager = .default, lockTimeout: TimeInterval = 0.25) {
    self.directoryURL = directoryURL
    self.fileManager = fileManager
    self.lockTimeout = lockTimeout
  }

  public func update<Result>(_ body: (inout [VoltraInteraction]) throws -> Result) throws -> Result {
    try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
    let lockURL = directoryURL.appendingPathComponent(lockFileName, isDirectory: false)
    let descriptor = open(lockURL.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { throw POSIXError(.EIO) }
    defer { close(descriptor) }
    try lock(descriptor)
    defer { flock(descriptor, LOCK_UN) }

    let queueURL = directoryURL.appendingPathComponent(Self.queueFileName, isDirectory: false)
    let original = try load(from: queueURL)
    var entries = original
    let result = try body(&entries)
    if entries != original {
      try JSONEncoder().encode(entries).write(to: queueURL, options: Self.writingOptions)
    }
    return result
  }

  #if os(iOS)
    /// Readable after the first unlock, so an intent running while the device is locked can record.
    private static let writingOptions: Data.WritingOptions = [.atomic, .completeFileProtectionUntilFirstUserAuthentication]
  #else
    private static let writingOptions: Data.WritingOptions = [.atomic]
  #endif

  private func lock(_ descriptor: Int32) throws {
    let deadline = Date().addingTimeInterval(lockTimeout)
    while true {
      if flock(descriptor, LOCK_EX | LOCK_NB) == 0 {
        return
      }
      let error = errno
      guard error == EWOULDBLOCK || error == EINTR, Date() < deadline else {
        throw POSIXError(POSIXErrorCode(rawValue: error) ?? .EIO)
      }
      usleep(2000)
    }
  }

  private func load(from url: URL) throws -> [VoltraInteraction] {
    guard fileManager.fileExists(atPath: url.path) else { return [] }
    let data = try Data(contentsOf: url)
    do {
      return try JSONDecoder().decode([VoltraInteraction].self, from: data)
    } catch {
      let quarantineURL = directoryURL.appendingPathComponent(Self.quarantineFileName, isDirectory: false)
      try? fileManager.removeItem(at: quarantineURL)
      try? fileManager.moveItem(at: url, to: quarantineURL)
      return []
    }
  }
}

/// Storage for a process without an App Group. It only reaches taps made in the same process, such
/// as a `VoltraView` in the app or a Live Activity intent the system runs in the app.
public final class VoltraInteractionMemoryStorage: VoltraInteractionStorage {
  private var entries: [VoltraInteraction] = []
  private let lock = NSLock()

  public init() {}

  public func update<Result>(_ body: (inout [VoltraInteraction]) throws -> Result) throws -> Result {
    lock.lock()
    defer { lock.unlock() }
    return try body(&entries)
  }
}

/// The bounded FIFO of taps waiting for JavaScript (ADR 0011).
///
/// Every tap is recorded here, whether or not the app is listening. JavaScript removes entries
/// with `pop`, which returns them in the same step, so an entry is either still queued or already
/// in JavaScript's hands. Entries older than `maxAge` and the oldest beyond `capacity` are dropped:
/// a tap nobody consumed for that long is no longer something to act on.
public final class VoltraInteractionQueue {
  public static let capacity = 100
  public static let maxAge: TimeInterval = 15 * 60

  private let storage: VoltraInteractionStorage
  private let now: () -> Date

  public init(storage: VoltraInteractionStorage, now: @escaping () -> Date = Date.init) {
    self.storage = storage
    self.now = now
  }

  @discardableResult
  public func record(_ interaction: VoltraInteraction) -> Bool {
    let cutoff = now().timeIntervalSince1970 - Self.maxAge
    do {
      try storage.update { entries in
        entries.removeAll { $0.timestamp < cutoff }
        entries.append(interaction)
        if entries.count > Self.capacity {
          entries.removeFirst(entries.count - Self.capacity)
        }
      }
      return true
    } catch {
      return false
    }
  }

  /// Puts taps JavaScript took but could not hand to any listener back at the front of the queue,
  /// skipping any already present. Age and capacity limits apply as usual.
  @discardableResult
  public func restore(_ interactions: [VoltraInteraction]) -> Bool {
    guard !interactions.isEmpty else { return true }
    let cutoff = now().timeIntervalSince1970 - Self.maxAge
    do {
      try storage.update { entries in
        let present = Set(entries.map(\.id))
        entries.insert(contentsOf: interactions.filter { !present.contains($0.id) }, at: 0)
        entries.removeAll { $0.timestamp < cutoff }
        if entries.count > Self.capacity {
          entries.removeFirst(entries.count - Self.capacity)
        }
      }
      return true
    } catch {
      return false
    }
  }

  /// Removes and returns queued taps in the order they happened. With `sources`, only taps from
  /// those sources are taken; the rest stay queued for a listener that wants them.
  public func pop(sources: Set<String>? = nil) -> [VoltraInteraction] {
    let cutoff = now().timeIntervalSince1970 - Self.maxAge
    do {
      return try storage.update { entries in
        entries.removeAll { $0.timestamp < cutoff }
        guard let sources else {
          defer { entries.removeAll() }
          return entries
        }
        let taken = entries.filter { sources.contains($0.source) }
        entries.removeAll { sources.contains($0.source) }
        return taken
      }
    } catch {
      return []
    }
  }
}
