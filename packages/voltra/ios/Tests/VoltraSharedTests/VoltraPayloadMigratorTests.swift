@testable import VoltraSharedCore
import XCTest

final class VoltraPayloadMigratorTests: XCTestCase {
  func testMigratesV1PayloadToCurrentVersion() throws {
    let payload = JSONValue.object([
      "v": .int(1),
      "t": .int(7),
      "p": .object([
        "title": .string("Hello"),
      ]),
    ])

    let migrated = try VoltraPayloadMigrator.migrateToCurrentVersion(payload)

    XCTAssertEqual(
      migrated,
      .object([
        "v": .int(2),
        "t": .int(7),
        "p": .object([
          "title": .string("Hello"),
        ]),
      ])
    )
  }

  func testCurrentVersionPayloadPassesThroughUnchanged() throws {
    let payload = JSONValue.object([
      "v": .int(VoltraPayloadMigrator.currentVersion),
      "t": .int(4),
    ])

    let migrated = try VoltraPayloadMigrator.migrateToCurrentVersion(payload)

    XCTAssertEqual(migrated, payload)
  }

  func testFutureVersionPayloadReturnsNil() throws {
    let payload = JSONValue.object([
      "v": .int(VoltraPayloadMigrator.currentVersion + 1),
    ])

    let migrated = try VoltraPayloadMigrator.migrateToCurrentVersion(payload)

    XCTAssertNil(migrated)
  }

  func testMissingVersionThrows() {
    let payload = JSONValue.object([
      "t": .int(4),
    ])

    XCTAssertThrowsError(try VoltraPayloadMigrator.migrateToCurrentVersion(payload)) { error in
      XCTAssertEqual(error as? VoltraPayloadError, .missingVersion)
    }
  }

  func testInvalidV1StructureThrows() {
    XCTAssertThrowsError(try VoltraPayloadMigrator.migrateToCurrentVersion(.array([.int(1)]))) { error in
      XCTAssertEqual(error as? VoltraPayloadError, .missingVersion)
    }
  }
}
