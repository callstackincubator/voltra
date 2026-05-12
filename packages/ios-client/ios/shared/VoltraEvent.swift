import Foundation

// MARK: - Event Types

/// All Voltra event types with their associated data
public enum VoltraEventType {
  /// Persistent events (widget → app, survives app death)
  case interaction(source: String, identifier: String, payload: String?)

  // Transient events (main app only, in-memory)
  case stateChange(activityName: String, state: String)
  case tokenReceived(activityName: String, pushToken: String)
  case pushToStartTokenReceived(token: String)

  /// Whether this event should be persisted to UserDefaults (survives app death)
  var isPersistent: Bool {
    switch self {
    case .interaction:
      return true
    default:
      return false
    }
  }

  /// The event name used for JS bridge
  var name: String {
    switch self {
    case .interaction:
      return "interaction"
    case .stateChange:
      return "stateChange"
    case .tokenReceived:
      return "activityTokenReceived"
    case .pushToStartTokenReceived:
      return "activityPushToStartTokenReceived"
    }
  }

  /// Convert to dictionary for JS bridge
  var asDictionary: [String: Any] {
    var dict: [String: Any] = ["type": name]

    switch self {
    case let .interaction(source, identifier, payload):
      dict["source"] = source
      dict["timestamp"] = Date().timeIntervalSince1970
      dict["identifier"] = identifier
      dict["payload"] = payload ?? ""

    case let .stateChange(activityName, state):
      dict["timestamp"] = Date().timeIntervalSince1970
      dict["activityName"] = activityName
      dict["activityState"] = state

    case let .tokenReceived(activityName, pushToken):
      dict["timestamp"] = Date().timeIntervalSince1970
      dict["activityName"] = activityName
      dict["pushToken"] = pushToken

    case let .pushToStartTokenReceived(token):
      dict["pushToStartToken"] = token
    }

    return dict
  }
}

// MARK: - Notification Name

extension Notification.Name {
  static let voltraEvent = Notification.Name("voltraEvent")
}
