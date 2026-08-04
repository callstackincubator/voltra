import Foundation

/// Persists the order in which the app process discovers ActivityKit instances.
/// ActivityKit exposes creation order only within a concrete attributes type, so
/// this ledger supplies a stable cross-engine order for unified query APIs.
final class VoltraLiveActivityChronology: @unchecked Sendable {
  static let shared = VoltraLiveActivityChronology()

  private static let storageKey = "Voltra_LiveActivityChronology"

  private let lock = NSLock()
  private let defaults: UserDefaults
  private var orderedIds: [String]

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    orderedIds = defaults.stringArray(forKey: Self.storageKey) ?? []
  }

  func record(_ activityId: String) {
    lock.lock()
    defer { lock.unlock() }
    guard !orderedIds.contains(activityId) else { return }
    orderedIds.append(activityId)
    persist()
  }

  func order(
    _ references: [VoltraDynamicLiveActivityReference]
  ) -> [VoltraDynamicLiveActivityReference] {
    lock.lock()
    defer { lock.unlock() }

    let referencesById = Dictionary(uniqueKeysWithValues: references.map { ($0.id, $0) })
    let nextOrder = VoltraLiveActivityOrder.reconcile(previous: orderedIds, active: references.map(\.id))

    if nextOrder != orderedIds {
      orderedIds = nextOrder
      persist()
    }
    return orderedIds.compactMap { referencesById[$0] }
  }

  private func persist() {
    defaults.set(orderedIds, forKey: Self.storageKey)
  }
}
