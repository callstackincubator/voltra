import Foundation
import os

/// Owns the production App Group interaction queue (ADR 0011). Any process that runs
/// `VoltraInteractionIntent` records here; the app pops when JavaScript asks.
public enum VoltraInteractionReporter {
  /// UserDefaults key of the queue earlier releases used. Its entries include taps the app had
  /// already handled, so they are discarded rather than migrated.
  private static let legacyQueueKey = "Voltra_EventsQueue"

  /// Without an App Group, taps survive only within this process.
  private static let processQueue = VoltraInteractionQueue(storage: VoltraInteractionMemoryStorage())

  private static var queue: VoltraInteractionQueue {
    guard
      let group = VoltraConfig.groupIdentifier(),
      let directoryURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else {
      return processQueue
    }
    return VoltraInteractionQueue(storage: VoltraInteractionFileStorage(directoryURL: directoryURL))
  }

  /// Persists the tap and signals every process that taps are available.
  @discardableResult
  public static func record(_ interaction: VoltraInteraction) -> Bool {
    guard queue.record(interaction) else {
      VoltraLogger.event.error("Failed to record interaction — interaction storage unavailable")
      return false
    }
    VoltraLogger.event.debug("Recorded interaction \(interaction.identifier, privacy: .public)")
    VoltraDarwinNotificationRelay.interactions.post()
    return true
  }

  public static func pop(sources: Set<String>?) -> [VoltraInteraction] {
    queue.pop(sources: sources)
  }

  /// The returned token must be removed when the JS bridge listener goes away.
  public static func observeChanges(_ handler: @escaping () -> Void) -> UUID {
    VoltraDarwinNotificationRelay.interactions.add(handler)
  }

  public static func removeChangeObserver(_ token: UUID) {
    VoltraDarwinNotificationRelay.interactions.remove(token)
  }

  static func discardLegacyQueue() {
    guard let group = VoltraConfig.groupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return }
    if defaults.object(forKey: legacyQueueKey) != nil {
      defaults.removeObject(forKey: legacyQueueKey)
      VoltraLogger.event.info("Discarded the interaction queue left by an earlier release")
    }
  }
}
