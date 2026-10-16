import Foundation

/// Owns the production App Group queue and OS logging path. The extension only
/// records failures; the app's event bus drains them when JavaScript can listen.
public enum VoltraDynamicLiveActivityRenderFailureReporter {
  private static var queue: VoltraDynamicLiveActivityRenderFailureQueue? {
    guard
      let group = VoltraConfig.groupIdentifier(),
      let directoryURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else {
      return nil
    }
    return VoltraDynamicLiveActivityRenderFailureQueue(
      storage: VoltraDynamicLiveActivityRenderFailureFileStorage(directoryURL: directoryURL)
    )
  }

  @discardableResult
  public static func record(activityName: String, definitionId: String, message: String) -> Bool {
    let failure = VoltraDynamicLiveActivityRenderFailure(
      activityName: activityName,
      definitionId: definitionId,
      message: message
    )
    let persisted = queue?.record(failure) ?? false
    VoltraLogger.activity.error(
      "[DynamicLiveActivity] activity=\(failure.activityName, privacy: .public) definitionId=\(failure.definitionId, privacy: .public) \(failure.message, privacy: .public)"
    )
    if persisted {
      VoltraDarwinNotificationRelay.renderFailures.post()
    } else {
      VoltraLogger.event.error("Failed to persist Dynamic Live Activity render failure")
    }
    return persisted
  }

  public static func drain() -> [VoltraDynamicLiveActivityRenderFailure] {
    queue?.drain() ?? []
  }

  /// The returned token must be removed when the JS bridge listener goes away.
  public static func observeChanges(_ handler: @escaping () -> Void) -> UUID {
    VoltraDarwinNotificationRelay.renderFailures.add(handler)
  }

  public static func removeChangeObserver(_ token: UUID) {
    VoltraDarwinNotificationRelay.renderFailures.remove(token)
  }
}
