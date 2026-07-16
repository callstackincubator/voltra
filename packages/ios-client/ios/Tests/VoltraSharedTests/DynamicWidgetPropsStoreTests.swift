import Foundation
@testable import VoltraSharedCore
import XCTest

final class DynamicWidgetPropsStoreTests: XCTestCase {
  func testReturnsCanonicalEmptyObjectWhenPropsAreAbsent() {
    let storage = InMemoryDynamicWidgetPropsStorage()
    let store = DynamicWidgetPropsStore(storage: storage)

    XCTAssertEqual(store.dynamicWidgetProps(for: "absent-dynamic-widget"), "{}")
  }

  func testPreservesNestedDynamicWidgetProps() throws {
    let storage = InMemoryDynamicWidgetPropsStorage()
    let store = DynamicWidgetPropsStore(storage: storage)
    let props = """
    {
      "title": "Forecast",
      "weather": {
        "temperatures": [18, 21, 19],
        "metadata": { "units": "celsius", "severe": false, "note": null }
      }
    }
    """

    try store.persistDynamicWidgetProps(props, for: "weather-dynamic-widget")

    XCTAssertEqual(
      try JSONValue.parse(from: store.dynamicWidgetProps(for: "weather-dynamic-widget")),
      try JSONValue.parse(from: props)
    )
  }

  func testIsolatesPropsByDynamicWidgetID() throws {
    let storage = InMemoryDynamicWidgetPropsStorage()
    let store = DynamicWidgetPropsStore(storage: storage)

    try store.persistDynamicWidgetProps(#"{"value":1}"#, for: "first-dynamic-widget")
    try store.persistDynamicWidgetProps(#"{"value":2}"#, for: "second-dynamic-widget")

    XCTAssertEqual(
      try JSONValue.parse(from: store.dynamicWidgetProps(for: "first-dynamic-widget")),
      try JSONValue.parse(from: #"{"value":1}"#)
    )
    XCTAssertEqual(
      try JSONValue.parse(from: store.dynamicWidgetProps(for: "second-dynamic-widget")),
      try JSONValue.parse(from: #"{"value":2}"#)
    )
  }

  func testPersistsPropsAcrossUserDefaultsBackedStoreRecreation() throws {
    let suiteName = "dev.voltra.tests.dynamic-widget-props.\(UUID().uuidString)"
    let firstDefaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
    defer { firstDefaults.removePersistentDomain(forName: suiteName) }

    let firstStore = DynamicWidgetPropsStore(
      storage: DynamicWidgetPropsUserDefaultsStorage(userDefaults: firstDefaults)
    )
    try firstStore.persistDynamicWidgetProps(
      #"{"session":"survives","nested":{"enabled":true}}"#,
      for: "persistent-dynamic-widget"
    )

    let recreatedDefaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
    let recreatedStore = DynamicWidgetPropsStore(
      storage: DynamicWidgetPropsUserDefaultsStorage(userDefaults: recreatedDefaults)
    )

    XCTAssertEqual(
      try JSONValue.parse(from: recreatedStore.dynamicWidgetProps(for: "persistent-dynamic-widget")),
      try JSONValue.parse(from: #"{"session":"survives","nested":{"enabled":true}}"#)
    )
  }

  func testInvalidInputDoesNotOverwritePreviousValidProps() throws {
    let storage = InMemoryDynamicWidgetPropsStorage()
    let store = DynamicWidgetPropsStore(storage: storage)
    let validProps = #"{"status":"valid"}"#
    try store.persistDynamicWidgetProps(validProps, for: "validated-dynamic-widget")

    for invalidProps in ["not json", #"["array"]"#, #""scalar""#, "42", "null"] {
      XCTAssertThrowsError(
        try store.persistDynamicWidgetProps(invalidProps, for: "validated-dynamic-widget")
      )
      XCTAssertEqual(
        try JSONValue.parse(from: store.dynamicWidgetProps(for: "validated-dynamic-widget")),
        try JSONValue.parse(from: validProps)
      )
    }
  }

  func testMalformedStoredEntryFallsBackToCanonicalEmptyObject() {
    let storage = InMemoryDynamicWidgetPropsStorage()
    storage.values[DynamicWidgetPropsStore.storageKey(for: "malformed-dynamic-widget")] = "not json"
    let store = DynamicWidgetPropsStore(storage: storage)

    XCTAssertEqual(store.dynamicWidgetProps(for: "malformed-dynamic-widget"), "{}")
  }

  func testUnsupportedStoredEntryVersionFallsBackToCanonicalEmptyObject() {
    let storage = InMemoryDynamicWidgetPropsStorage()
    storage.values[DynamicWidgetPropsStore.storageKey(for: "future-dynamic-widget")] = #"{"dynamicWidgetPropsStorageVersion":99,"dynamicWidgetProps":{"value":1}}"#
    let store = DynamicWidgetPropsStore(storage: storage)

    XCTAssertEqual(store.dynamicWidgetProps(for: "future-dynamic-widget"), "{}")
  }

  func testNonObjectStoredPropsFallBackToCanonicalEmptyObject() {
    let storage = InMemoryDynamicWidgetPropsStorage()
    let invalidStoredProps = [
      #"{"dynamicWidgetPropsStorageVersion":1,"dynamicWidgetProps":[]}"#,
      #"{"dynamicWidgetPropsStorageVersion":1,"dynamicWidgetProps":"scalar"}"#,
      #"{"dynamicWidgetPropsStorageVersion":1,"dynamicWidgetProps":null}"#,
    ]
    let store = DynamicWidgetPropsStore(storage: storage)

    for (index, storedProps) in invalidStoredProps.enumerated() {
      let dynamicWidgetID = "non-object-dynamic-widget-\(index)"
      storage.values[DynamicWidgetPropsStore.storageKey(for: dynamicWidgetID)] = storedProps

      XCTAssertEqual(store.dynamicWidgetProps(for: dynamicWidgetID), "{}")
    }
  }

  func testDynamicWidgetPropsNamespaceDoesNotReadLegacyWidgetJSON() {
    let storage = InMemoryDynamicWidgetPropsStorage()
    storage.values[VoltraStorageKeys.widgetJson("weather")] = #"{"legacy":true}"#
    let store = DynamicWidgetPropsStore(storage: storage)

    XCTAssertNotEqual(
      DynamicWidgetPropsStore.storageKey(for: "weather"),
      VoltraStorageKeys.widgetJson("weather")
    )
    XCTAssertEqual(store.dynamicWidgetProps(for: "weather"), "{}")
  }

  func testNonStringUserDefaultsEntryFallsBackToCanonicalEmptyObject() throws {
    let suiteName = "dev.voltra.tests.dynamic-widget-props.wrong-type.\(UUID().uuidString)"
    let userDefaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
    defer { userDefaults.removePersistentDomain(forName: suiteName) }
    userDefaults.set(
      ["not", "a", "stored", "JSON", "string"],
      forKey: DynamicWidgetPropsStore.storageKey(for: "wrong-type-dynamic-widget")
    )
    let store = DynamicWidgetPropsStore(
      storage: DynamicWidgetPropsUserDefaultsStorage(userDefaults: userDefaults)
    )

    XCTAssertEqual(store.dynamicWidgetProps(for: "wrong-type-dynamic-widget"), "{}")
  }

  func testWriteFailureIsPropagatedWithoutReplacingPreviousProps() throws {
    let storage = InMemoryDynamicWidgetPropsStorage()
    let store = DynamicWidgetPropsStore(storage: storage)
    let previousProps = #"{"status":"previous"}"#
    try store.persistDynamicWidgetProps(previousProps, for: "failing-dynamic-widget")
    storage.writeError = TestStorageError.persistenceFailed

    XCTAssertThrowsError(
      try store.persistDynamicWidgetProps(
        #"{"status":"replacement"}"#,
        for: "failing-dynamic-widget"
      )
    ) { error in
      XCTAssertEqual(error as? TestStorageError, .persistenceFailed)
    }
    XCTAssertEqual(
      try JSONValue.parse(from: store.dynamicWidgetProps(for: "failing-dynamic-widget")),
      try JSONValue.parse(from: previousProps)
    )
  }

  func testReadFailureFallsBackToCanonicalEmptyObject() {
    let storage = InMemoryDynamicWidgetPropsStorage()
    storage.readError = TestStorageError.readFailed
    let store = DynamicWidgetPropsStore(storage: storage)

    XCTAssertEqual(store.dynamicWidgetProps(for: "unavailable-dynamic-widget"), "{}")
  }

  func testMissingAppGroupConfigurationFailsWritesAndReadsSafely() {
    let store = DynamicWidgetPropsStore()

    XCTAssertEqual(store.dynamicWidgetProps(for: "unconfigured-dynamic-widget"), "{}")
    XCTAssertThrowsError(
      try store.persistDynamicWidgetProps(
        #"{"status":"replacement"}"#,
        for: "unconfigured-dynamic-widget"
      )
    ) { error in
      XCTAssertEqual(error as? DynamicWidgetPropsStoreError, .appGroupNotConfigured)
    }
  }
}

private enum TestStorageError: Error, Equatable {
  case persistenceFailed
  case readFailed
}

private final class InMemoryDynamicWidgetPropsStorage: DynamicWidgetPropsStorage {
  var values: [String: String] = [:]
  var readError: Error?
  var writeError: Error?

  func string(forKey key: String) throws -> String? {
    if let readError {
      throw readError
    }
    return values[key]
  }

  func set(_ value: String, forKey key: String) throws {
    if let writeError {
      throw writeError
    }
    values[key] = value
  }
}
