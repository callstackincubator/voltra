import Foundation
import os

/// Owns the production interaction queue (ADR 0011). Any process that runs
/// `VoltraInteractionIntent` records here; the app pops when JavaScript asks.
public enum VoltraInteractionReporter {
  /// UserDefaults key of the queue earlier releases used. Its entries include taps the app had
  /// already handled, so they are discarded rather than migrated.
  static let legacyQueueKey = "Voltra_EventsQueue"

  /// Taps this process could not write to the App Group, or every tap when there is no App Group.
  /// They reach JavaScript only in this process.
  private static let processQueue = VoltraInteractionQueue(storage: VoltraInteractionMemoryStorage())

  private static var sharedQueue: VoltraInteractionQueue? {
    guard
      let group = VoltraConfig.groupIdentifier(),
      let directoryURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else {
      return nil
    }
    return VoltraInteractionQueue(storage: VoltraInteractionFileStorage(directoryURL: directoryURL))
  }

  /// Records the tap and signals every process that taps are available.
  @discardableResult
  public static func record(_ interaction: VoltraInteraction) -> Bool {
    if let sharedQueue, sharedQueue.record(interaction) {
      VoltraLogger.event.debug("Recorded interaction \(interaction.identifier, privacy: .public)")
    } else {
      // No App Group, or the shared file is unavailable (lock timeout, locked device). Keep the tap
      // for a listener in this process rather than dropping it.
      guard processQueue.record(interaction) else { return false }
      VoltraLogger.event.info("Recorded interaction \(interaction.identifier, privacy: .public) in process memory")
    }
    VoltraDarwinNotificationRelay.interactions.post()
    return true
  }

  /// Taps from the App Group and from this process, oldest first.
  public static func pop(sources: Set<String>?) -> [VoltraInteraction] {
    let shared = sharedQueue?.pop(sources: sources) ?? []
    let local = processQueue.pop(sources: sources)
    guard !local.isEmpty else { return shared }
    return (shared + local).sorted { $0.timestamp < $1.timestamp }
  }

  /// Puts taps JavaScript could not dispatch back at the front of the queue.
  public static func restore(_ interactions: [VoltraInteraction]) {
    guard !interactions.isEmpty else { return }
    if let sharedQueue, sharedQueue.restore(interactions) {
      return
    }
    processQueue.restore(interactions)
  }

  /// The returned token must be removed when the JS bridge listener goes away.
  public static func observeChanges(_ handler: @escaping () -> Void) -> UUID {
    VoltraDarwinNotificationRelay.interactions.add(handler)
  }

  public static func removeChangeObserver(_ token: UUID) {
    VoltraDarwinNotificationRelay.interactions.remove(token)
  }

  static func discardLegacyQueue(in defaults: UserDefaults? = VoltraConfig.groupIdentifier().flatMap(UserDefaults.init(suiteName:))) {
    guard let defaults, defaults.object(forKey: legacyQueueKey) != nil else { return }
    defaults.removeObject(forKey: legacyQueueKey)
    VoltraLogger.event.info("Discarded the interaction queue left by an earlier release")
  }
}
