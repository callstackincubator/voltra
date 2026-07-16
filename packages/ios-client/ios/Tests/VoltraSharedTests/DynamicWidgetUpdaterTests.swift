@testable import VoltraSharedCore
import XCTest

final class DynamicWidgetUpdaterTests: XCTestCase {
  func testPersistsNestedDynamicWidgetPropsBeforeReloadingOnlyThatDynamicWidget() async throws {
    let storage = DynamicWidgetUpdaterTestStorage()
    let store = DynamicWidgetPropsStore(storage: storage)
    var reloadedDynamicWidgetIDs: [String] = []
    var dynamicWidgetPropsObservedAtReload: String?
    let updater = DynamicWidgetUpdater(
      dynamicWidgetPropsPersistence: store,
      dynamicWidgetTimelineReload: { dynamicWidgetID in
        reloadedDynamicWidgetIDs.append(dynamicWidgetID)
        dynamicWidgetPropsObservedAtReload = store.dynamicWidgetProps(for: dynamicWidgetID)
      }
    )
    let dynamicWidgetPropsJSON = #"{"title":"Forecast","weather":{"temperatures":[18,21],"metadata":{"units":"celsius"}}}"#

    try await updater.updateDynamicWidget(
      dynamicWidgetID: "ClientRenderedDemoWidget",
      dynamicWidgetPropsJSON: dynamicWidgetPropsJSON
    )

    XCTAssertEqual(reloadedDynamicWidgetIDs, ["ClientRenderedDemoWidget"])
    XCTAssertEqual(
      try JSONValue.parse(from: dynamicWidgetPropsObservedAtReload ?? ""),
      try JSONValue.parse(from: dynamicWidgetPropsJSON)
    )
  }

  func testInvalidDynamicWidgetPropsDoNotOverwriteStoredPropsOrReload() async throws {
    let storage = DynamicWidgetUpdaterTestStorage()
    let store = DynamicWidgetPropsStore(storage: storage)
    let dynamicWidgetID = "validation-dynamic-widget"
    let lastValidDynamicWidgetPropsJSON = #"{"status":"valid"}"#
    try store.persistDynamicWidgetProps(lastValidDynamicWidgetPropsJSON, for: dynamicWidgetID)
    var reloadCount = 0
    let updater = DynamicWidgetUpdater(
      dynamicWidgetPropsPersistence: store,
      dynamicWidgetTimelineReload: { _ in reloadCount += 1 }
    )

    for invalidDynamicWidgetPropsJSON in ["not-json", #"["not","an","object"]"#] {
      do {
        try await updater.updateDynamicWidget(
          dynamicWidgetID: dynamicWidgetID,
          dynamicWidgetPropsJSON: invalidDynamicWidgetPropsJSON
        )
        XCTFail("Expected invalid Dynamic Widget props to fail")
      } catch {
        XCTAssertTrue(error is DynamicWidgetPropsStoreError)
      }

      XCTAssertEqual(
        try JSONValue.parse(from: store.dynamicWidgetProps(for: dynamicWidgetID)),
        try JSONValue.parse(from: lastValidDynamicWidgetPropsJSON)
      )
      XCTAssertEqual(reloadCount, 0)
    }
  }

  func testPropagatesPersistenceFailureWithoutReloading() async {
    let persistenceFailure = DynamicWidgetUpdaterTestError.persistence
    var reloadTriggered = false
    let updater = DynamicWidgetUpdater(
      dynamicWidgetPropsPersistence: DynamicWidgetUpdaterFailingPersistence(error: persistenceFailure),
      dynamicWidgetTimelineReload: { _ in reloadTriggered = true }
    )

    do {
      try await updater.updateDynamicWidget(
        dynamicWidgetID: "storage-failure-dynamic-widget",
        dynamicWidgetPropsJSON: "{}"
      )
      XCTFail("Expected Dynamic Widget persistence to fail")
    } catch {
      XCTAssertEqual(error as? DynamicWidgetUpdaterTestError, persistenceFailure)
    }
    XCTAssertFalse(reloadTriggered)
  }

  func testPropagatesReloadFailureAfterKeepingNewPropsStored() async throws {
    let storage = DynamicWidgetUpdaterTestStorage()
    let store = DynamicWidgetPropsStore(storage: storage)
    let reloadFailure = DynamicWidgetUpdaterTestError.reload
    let dynamicWidgetPropsJSON = #"{"persisted":true}"#
    let updater = DynamicWidgetUpdater(
      dynamicWidgetPropsPersistence: store,
      dynamicWidgetTimelineReload: { _ in throw reloadFailure }
    )

    do {
      try await updater.updateDynamicWidget(
        dynamicWidgetID: "reload-failure-dynamic-widget",
        dynamicWidgetPropsJSON: dynamicWidgetPropsJSON
      )
      XCTFail("Expected Dynamic Widget reload to fail")
    } catch {
      XCTAssertEqual(error as? DynamicWidgetUpdaterTestError, reloadFailure)
    }
    XCTAssertEqual(
      try JSONValue.parse(from: store.dynamicWidgetProps(for: "reload-failure-dynamic-widget")),
      try JSONValue.parse(from: dynamicWidgetPropsJSON)
    )
  }
}

private enum DynamicWidgetUpdaterTestError: Error {
  case persistence
  case reload
}

private struct DynamicWidgetUpdaterFailingPersistence: DynamicWidgetPropsPersistence {
  let error: Error

  func persistDynamicWidgetProps(_: String, for _: String) throws {
    throw error
  }
}

private final class DynamicWidgetUpdaterTestStorage: DynamicWidgetPropsStorage {
  var values: [String: String] = [:]

  func string(forKey key: String) throws -> String? {
    values[key]
  }

  func set(_ value: String, forKey key: String) throws {
    values[key] = value
  }
}
