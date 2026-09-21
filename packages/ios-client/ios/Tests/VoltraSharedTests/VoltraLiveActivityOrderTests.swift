@testable import VoltraSharedCore
import XCTest

final class VoltraLiveActivityOrderTests: XCTestCase {
  func testPreservesKnownCrossEngineOrderAndAppendsDiscoveries() {
    XCTAssertEqual(
      VoltraLiveActivityOrder.reconcile(
        previous: ["dynamic-first", "legacy-second"],
        active: ["legacy-second", "legacy-new", "dynamic-first", "dynamic-new"]
      ),
      ["dynamic-first", "legacy-second", "legacy-new", "dynamic-new"]
    )
  }

  func testPrunesEndedActivitiesAndDuplicateDiscoveries() {
    XCTAssertEqual(
      VoltraLiveActivityOrder.reconcile(
        previous: ["ended", "active", "active"],
        active: ["active", "new", "new"]
      ),
      ["active", "new"]
    )
  }
}
