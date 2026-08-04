@testable import VoltraSharedCore
import XCTest

final class DynamicLiveActivityRenderFailureQueueTests: XCTestCase {
  func testCapsQueueAtOneHundredAndDropsOldestFailuresInOrder() {
    let storage = InMemoryRenderFailureStorage()
    let queue = VoltraDynamicLiveActivityRenderFailureQueue(storage: storage)

    for index in 0 ... 100 {
      XCTAssertTrue(queue.record(failure(index)))
    }

    let failures = queue.drain()
    XCTAssertEqual(failures.count, 100)
    XCTAssertEqual(failures.first?.activityName, "activity-1")
    XCTAssertEqual(failures.last?.activityName, "activity-100")
  }

  func testDoesNotDeduplicateEquivalentFailures() {
    let queue = VoltraDynamicLiveActivityRenderFailureQueue(storage: InMemoryRenderFailureStorage())
    let repeated = failure(1)

    XCTAssertTrue(queue.record(repeated))
    XCTAssertTrue(queue.record(repeated))

    XCTAssertEqual(queue.drain(), [repeated, repeated])
  }

  func testPersistsOnlyTheApprovedSanitizedFields() {
    let failure = VoltraDynamicLiveActivityRenderFailure(
      activityName: "order-123",
      definitionId: "order_finished",
      message: "  invalid props\ncontained\tprivate data  ",
      timestamp: Date(timeIntervalSince1970: 123)
    )

    XCTAssertEqual(
      Set(failure.dictionary.keys),
      ["type", "source", "timestamp", "activityName", "definitionId", "message"]
    )
    XCTAssertEqual(failure.type, "dynamicLiveActivityRenderFailed")
    XCTAssertEqual(failure.source, "order-123")
    XCTAssertEqual(failure.message, "invalid props contained private data")
  }

  func testDedicatedStorageNeverMutatesInteractionQueueData() {
    let storage = InMemoryRenderFailureStorage()
    storage.interactionEvents = ["interaction event"]
    let queue = VoltraDynamicLiveActivityRenderFailureQueue(storage: storage)

    XCTAssertTrue(queue.record(failure(1)))
    _ = queue.drain()

    XCTAssertEqual(storage.interactionEvents, ["interaction event"])
  }

  private func failure(_ index: Int) -> VoltraDynamicLiveActivityRenderFailure {
    VoltraDynamicLiveActivityRenderFailure(
      activityName: "activity-\(index)",
      definitionId: "definition",
      message: "failure \(index)",
      timestamp: Date(timeIntervalSince1970: Double(index))
    )
  }
}

private final class InMemoryRenderFailureStorage: VoltraDynamicLiveActivityRenderFailureStorage {
  var failures: [VoltraDynamicLiveActivityRenderFailure] = []
  var interactionEvents: [String] = []

  func load() throws -> [VoltraDynamicLiveActivityRenderFailure] {
    failures
  }

  func save(_ failures: [VoltraDynamicLiveActivityRenderFailure]) throws {
    self.failures = failures
  }
}
