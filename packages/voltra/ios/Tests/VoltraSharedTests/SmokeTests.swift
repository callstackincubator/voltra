@testable import VoltraSharedCore
import XCTest

final class SmokeTests: XCTestCase {
  func testSharedCoreCurrentPayloadVersionIsTwo() {
    XCTAssertEqual(VoltraPayloadMigrator.currentVersion, 2)
  }
}
