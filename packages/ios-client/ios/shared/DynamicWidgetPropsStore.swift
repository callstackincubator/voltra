import Foundation

/// Versioned, per-ID Dynamic Widget props shared by the app and widget extension processes.
struct DynamicWidgetPropsStore {
  private let storage: Result<any DynamicWidgetPropsStorage, Error>

  init() {
    guard let groupIdentifier = VoltraConfig.groupIdentifier() else {
      storage = .failure(DynamicWidgetPropsStoreError.appGroupNotConfigured)
      return
    }
    guard let userDefaults = UserDefaults(suiteName: groupIdentifier) else {
      storage = .failure(DynamicWidgetPropsStoreError.userDefaultsUnavailable)
      return
    }
    storage = .success(DynamicWidgetPropsUserDefaultsStorage(userDefaults: userDefaults))
  }

  init(storage: any DynamicWidgetPropsStorage) {
    self.storage = .success(storage)
  }

  func persistDynamicWidgetProps(_ dynamicWidgetPropsJSON: String, for dynamicWidgetID: String) throws {
    let storageEntryJSON = try DynamicWidgetPropsCodec.encodeStorageEntry(
      dynamicWidgetPropsJSON: dynamicWidgetPropsJSON
    )
    let resolvedStorage = try storage.get()
    try resolvedStorage.set(storageEntryJSON, forKey: Self.storageKey(for: dynamicWidgetID))
  }

  func dynamicWidgetProps(for dynamicWidgetID: String) -> String {
    guard
      case let .success(resolvedStorage) = storage,
      let storageEntryJSON = try? resolvedStorage.string(forKey: Self.storageKey(for: dynamicWidgetID))
    else {
      return DynamicWidgetPropsCodec.emptyDynamicWidgetPropsJSON
    }

    return DynamicWidgetPropsCodec.decodeDynamicWidgetProps(storageEntryJSON: storageEntryJSON)
  }

  func clearDynamicWidgetProps(for dynamicWidgetID: String) throws {
    let resolvedStorage = try storage.get()
    try resolvedStorage.removeObject(forKey: Self.storageKey(for: dynamicWidgetID))
  }

  static func storageKey(for dynamicWidgetID: String) -> String {
    VoltraStorageKeys.dynamicWidgetPropsV1(dynamicWidgetID)
  }
}
