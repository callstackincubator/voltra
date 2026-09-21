import Foundation

/// Reconciles a persisted cross-engine creation order with ActivityKit's
/// currently active IDs, pruning ended activities and appending new discoveries.
public enum VoltraLiveActivityOrder {
  public static func reconcile(previous: [String], active: [String]) -> [String] {
    let activeIds = Set(active)
    var seen = Set<String>()
    var result: [String] = []

    for id in previous where activeIds.contains(id) && seen.insert(id).inserted {
      result.append(id)
    }
    for id in active where seen.insert(id).inserted {
      result.append(id)
    }
    return result
  }
}
