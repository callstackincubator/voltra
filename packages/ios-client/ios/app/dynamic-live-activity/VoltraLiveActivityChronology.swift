import Foundation

/// Persists creation-time observations made by this app process. ActivityKit
/// does not expose a cross-attributes-type creation timestamp, so an instance
/// first encountered after a process restart must never be assigned an order
/// merely because a catalog happened to enumerate it first.
final class VoltraLiveActivityChronology: @unchecked Sendable {
  static let shared = VoltraLiveActivityChronology()

  private static let storageKey = "Voltra_LiveActivityChronology"

  private let lock = NSLock()
  private let defaults: UserDefaults
  private var timestamps: [String: TimeInterval]

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    if let stored = defaults.dictionary(forKey: Self.storageKey) as? [String: TimeInterval] {
      timestamps = stored
    } else {
      // Migrate the previous observation-order ledger without reordering it.
      let legacy = defaults.stringArray(forKey: Self.storageKey) ?? []
      timestamps = Dictionary(uniqueKeysWithValues: legacy.enumerated().map { index, id in (id, Double(index)) })
    }
  }

  func record(_ activityId: String) {
    lock.lock()
    defer { lock.unlock() }
    guard timestamps[activityId] == nil else { return }
    timestamps[activityId] = Date().timeIntervalSince1970
    persist()
  }

  func order(
    _ references: [VoltraDynamicLiveActivityReference]
  ) -> [VoltraDynamicLiveActivityReference] {
    lock.lock()
    defer { lock.unlock() }

    let activeIds = Set(references.map(\.id))
    let nextTimestamps = timestamps.filter { activeIds.contains($0.key) }
    if nextTimestamps != timestamps {
      timestamps = nextTimestamps
      persist()
    }
    return references.sorted { lhs, rhs in
      switch (timestamps[lhs.id], timestamps[rhs.id]) {
      case let (left?, right?): return left < right
      case (_?, nil): return true
      case (nil, _?): return false
      case (nil, nil): return lhs.id < rhs.id
      }
    }
  }

  func latest(_ references: [VoltraDynamicLiveActivityReference]) -> VoltraDynamicLiveActivityReference? {
    lock.lock()
    defer { lock.unlock() }
    return references.compactMap { reference in
      timestamps[reference.id].map { (reference, $0) }
    }.max { $0.1 < $1.1 }?.0
  }

  private func persist() {
    defaults.set(timestamps, forKey: Self.storageKey)
  }
}
