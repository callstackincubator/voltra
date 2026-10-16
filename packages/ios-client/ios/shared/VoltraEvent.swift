import Foundation

// MARK: - Event Types

/// All Voltra event types with their associated data
public enum VoltraEventType {
  /// Persistent events: recorded in the App Group interaction queue, never posted directly
  case interaction(source: String, identifier: String, payload: String?)

  // Transient events (main app only, in-memory)
  case stateChange(activityName: String, state: String)
  case tokenReceived(activityName: String, pushToken: String)
  case pushToStartTokenReceived(token: String)
  case activityEnablementChanged(enabled: Bool)

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
    case .activityEnablementChanged:
      return "activityEnablementChanged"
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

    case let .activityEnablementChanged(enabled):
      dict["timestamp"] = Date().timeIntervalSince1970
      dict["enabled"] = enabled
    }

    return dict
  }
}

// MARK: - Notification Name

extension Notification.Name {
  static let voltraEvent = Notification.Name("voltraEvent")
}
