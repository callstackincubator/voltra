import Foundation

enum DynamicWidgetPropsStoreError: Error, Equatable, LocalizedError {
  case appGroupNotConfigured
  case userDefaultsUnavailable
  case persistenceFailed
  case invalidJSON
  case topLevelValueMustBeObject

  var errorDescription: String? {
    switch self {
    case .appGroupNotConfigured:
      return "App Group not configured. Set 'groupIdentifier' in the Voltra config plugin to use Dynamic Widgets."
    case .userDefaultsUnavailable:
      return "Unable to access UserDefaults for the Dynamic Widget App Group."
    case .persistenceFailed:
      return "Failed to persist Dynamic Widget props to the App Group."
    case .invalidJSON:
      return "Dynamic Widget props must be valid JSON."
    case .topLevelValueMustBeObject:
      return "Dynamic Widget props must be a top-level JSON object."
    }
  }
}

protocol DynamicWidgetPropsStorage {
  func string(forKey key: String) throws -> String?
  func set(_ value: String, forKey key: String) throws
  func removeObject(forKey key: String) throws
}

struct DynamicWidgetPropsUserDefaultsStorage: DynamicWidgetPropsStorage {
  private let userDefaults: UserDefaults

  init(userDefaults: UserDefaults) {
    self.userDefaults = userDefaults
  }

  func string(forKey key: String) throws -> String? {
    userDefaults.string(forKey: key)
  }

  func set(_ value: String, forKey key: String) throws {
    userDefaults.set(value, forKey: key)
    guard userDefaults.synchronize() else {
      throw DynamicWidgetPropsStoreError.persistenceFailed
    }
  }

  func removeObject(forKey key: String) throws {
    userDefaults.removeObject(forKey: key)
  }
}
