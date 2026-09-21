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

  /// The type-level (widget-scoped) write path — the app's `updateDynamicWidget`.
  func persistDynamicWidgetProps(_ dynamicWidgetPropsJSON: String, for dynamicWidgetID: String) throws {
    try persist(dynamicWidgetPropsJSON, storageKey: Self.storageKey(for: dynamicWidgetID))
  }

  /// The instance write path — a committed per-instance server fetch (ADR 0007).
  func persistInstanceDynamicWidgetProps(_ dynamicWidgetPropsJSON: String, for scope: WidgetScope) throws {
    guard case let .instance(widgetId, key) = scope else {
      try persistDynamicWidgetProps(dynamicWidgetPropsJSON, for: scope.widgetId)
      return
    }
    try persist(dynamicWidgetPropsJSON, storageKey: VoltraStorageKeys.dynamicWidgetInstancePropsV1(scope.storageKey))
    try addInstanceKeyToIndex(key, for: widgetId)
  }

  private func persist(_ dynamicWidgetPropsJSON: String, storageKey: String) throws {
    let storageEntryJSON = try DynamicWidgetPropsCodec.encodeStorageEntry(
      dynamicWidgetPropsJSON: dynamicWidgetPropsJSON
    )
    let resolvedStorage = try storage.get()
    try resolvedStorage.set(storageEntryJSON, forKey: storageKey)
  }

  /// The type-level props only, with no instance fallback — used by the trial render.
  func dynamicWidgetProps(for dynamicWidgetID: String) -> String {
    read(storageKey: Self.storageKey(for: dynamicWidgetID)) ?? DynamicWidgetPropsCodec.emptyDynamicWidgetPropsJSON
  }

  /// Props for one placement: the instance slot for `scope`'s key, falling back to the widget slot
  /// when the instance has not fetched yet or has no configuration (ADR 0007).
  func dynamicWidgetProps(for scope: WidgetScope) -> String {
    switch scope {
    case let .widget(id):
      return dynamicWidgetProps(for: id)
    case .instance:
      if let instanceProps = read(storageKey: VoltraStorageKeys.dynamicWidgetInstancePropsV1(scope.storageKey)) {
        return instanceProps
      }
      return dynamicWidgetProps(for: scope.widgetId)
    }
  }

  private func read(storageKey: String) -> String? {
    guard case let .success(resolvedStorage) = storage else { return nil }
    guard let storageEntryJSON = (try? resolvedStorage.string(forKey: storageKey)) ?? nil else {
      return nil
    }

    return DynamicWidgetPropsCodec.decodeDynamicWidgetProps(storageEntryJSON: storageEntryJSON)
  }

  /// Clears the widget-level props and every instance slot of `dynamicWidgetID` (ADR 0007):
  /// `clearWidget` and logout are meant to reset a widget entirely, not leave stale per-instance
  /// data behind that a fallback would never reveal again.
  func clearDynamicWidgetProps(for dynamicWidgetID: String) throws {
    let resolvedStorage = try storage.get()
    let instanceKeys = instanceKeys(for: dynamicWidgetID)

    try resolvedStorage.removeObject(forKey: Self.storageKey(for: dynamicWidgetID))
    try resolvedStorage.removeObject(forKey: VoltraStorageKeys.dynamicWidgetPropsInstanceIndexV1(dynamicWidgetID))
    for key in instanceKeys {
      let instanceStorageKey = VoltraStorageKeys.dynamicWidgetInstancePropsV1("\(dynamicWidgetID)#\(key)")
      try resolvedStorage.removeObject(forKey: instanceStorageKey)
    }
  }

  /// The instance keys `dynamicWidgetID` has ever fetched into, so callers can clear per-instance
  /// state that lives in other stores (status, ETag).
  func instanceKeys(for dynamicWidgetID: String) -> Set<String> {
    guard
      case let .success(resolvedStorage) = storage,
      let raw = try? resolvedStorage.string(forKey: VoltraStorageKeys.dynamicWidgetPropsInstanceIndexV1(dynamicWidgetID)) ?? nil,
      let data = raw.data(using: .utf8),
      let keys = try? JSONDecoder().decode([String].self, from: data)
    else {
      return []
    }
    return Set(keys)
  }

  private func addInstanceKeyToIndex(_ key: String, for dynamicWidgetID: String) throws {
    var current = instanceKeys(for: dynamicWidgetID)
    guard !current.contains(key) else { return }
    current.insert(key)

    let resolvedStorage = try storage.get()
    let data = try JSONEncoder().encode(current.sorted())
    guard let json = String(data: data, encoding: .utf8) else { return }
    try resolvedStorage.set(json, forKey: VoltraStorageKeys.dynamicWidgetPropsInstanceIndexV1(dynamicWidgetID))
  }

  static func storageKey(for dynamicWidgetID: String) -> String {
    VoltraStorageKeys.dynamicWidgetPropsV1(dynamicWidgetID)
  }
}
