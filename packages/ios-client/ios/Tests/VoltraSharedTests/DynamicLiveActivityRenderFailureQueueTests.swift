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

  func testFileStorageRecoversFromCorruptData() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try Data("not-json".utf8).write(
      to: directory.appendingPathComponent("dynamic-live-activity-render-failures-v1.json")
    )
    let queue = VoltraDynamicLiveActivityRenderFailureQueue(
      storage: VoltraDynamicLiveActivityRenderFailureFileStorage(directoryURL: directory)
    )

    XCTAssertTrue(queue.record(failure(1)))
    XCTAssertEqual(queue.drain(), [failure(1)])
    XCTAssertTrue(
      try FileManager.default.contentsOfDirectory(atPath: directory.path).contains { $0.contains(".corrupt-") }
    )
  }

  func testFileStorageSerializesConcurrentWritersAcrossQueueInstances() {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    let queues = (0 ..< 20).map { _ in
      VoltraDynamicLiveActivityRenderFailureQueue(
        storage: VoltraDynamicLiveActivityRenderFailureFileStorage(directoryURL: directory)
      )
    }
    let group = DispatchGroup()
    for (index, queue) in queues.enumerated() {
      group.enter()
      DispatchQueue.global().async {
        XCTAssertTrue(queue.record(self.failure(index)))
        group.leave()
      }
    }
    XCTAssertEqual(group.wait(timeout: .now() + 5), .success)

    let failures = queues[0].drain()
    XCTAssertEqual(failures.count, 20)
    XCTAssertEqual(Set(failures.map(\.activityName)).count, 20)
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

  private let lock = NSLock()

  func append(_ failure: VoltraDynamicLiveActivityRenderFailure, capacity: Int) throws {
    lock.lock()
    defer { lock.unlock() }
    failures.append(failure)
    if failures.count > capacity {
      failures.removeFirst(failures.count - capacity)
    }
  }

  func drain() throws -> [VoltraDynamicLiveActivityRenderFailure] {
    lock.lock()
    defer { lock.unlock() }
    defer { failures.removeAll() }
    return failures
  }
}
