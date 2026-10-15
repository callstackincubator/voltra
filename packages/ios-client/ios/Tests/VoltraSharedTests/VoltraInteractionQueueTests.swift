@testable import VoltraSharedCore
import XCTest

final class VoltraInteractionQueueTests: XCTestCase {
  private var now = Date(timeIntervalSince1970: 10000)

  func testPopReturnsTapsOldestFirstAndEmptiesTheQueue() {
    let queue = makeQueue()
    queue.record(tap("a", at: 1))
    queue.record(tap("b", at: 2))

    XCTAssertEqual(queue.pop().map(\.identifier), ["a", "b"])
    XCTAssertEqual(queue.pop(), [])
  }

  func testPopBySourceLeavesOtherSourcesQueuedInOrder() {
    let queue = makeQueue()
    queue.record(tap("activity-1", source: "order-123", at: 1))
    queue.record(tap("view-1", source: "voltra-view", at: 2))
    queue.record(tap("activity-2", source: "order-123", at: 3))

    XCTAssertEqual(queue.pop(sources: ["voltra-view"]).map(\.identifier), ["view-1"])
    XCTAssertEqual(queue.pop().map(\.identifier), ["activity-1", "activity-2"])
  }

  func testDropsTapsOlderThanMaxAge() {
    let queue = makeQueue()
    queue.record(tap("stale", at: -VoltraInteractionQueue.maxAge - 1))
    queue.record(tap("fresh", at: -VoltraInteractionQueue.maxAge + 1))

    XCTAssertEqual(queue.pop().map(\.identifier), ["fresh"])
  }

  func testCapsQueueAndDropsTheOldestTaps() {
    let queue = makeQueue()
    for index in 0 ... VoltraInteractionQueue.capacity {
      queue.record(tap("tap-\(index)", at: Double(index) / 1000))
    }

    let taps = queue.pop()
    XCTAssertEqual(taps.count, VoltraInteractionQueue.capacity)
    XCTAssertEqual(taps.first?.identifier, "tap-1")
    XCTAssertEqual(taps.last?.identifier, "tap-\(VoltraInteractionQueue.capacity)")
  }

  func testEqualTapsKeepDistinctIds() {
    let queue = makeQueue()
    queue.record(VoltraInteraction(source: "order-123", identifier: "pause", payload: nil, timestamp: now))
    queue.record(VoltraInteraction(source: "order-123", identifier: "pause", payload: nil, timestamp: now))

    let taps = queue.pop()
    XCTAssertEqual(taps.count, 2)
    XCTAssertNotEqual(taps[0].id, taps[1].id)
  }

  func testDictionaryCarriesTheJavaScriptEventShape() {
    let interaction = VoltraInteraction(
      source: "order-123",
      identifier: "pause",
      payload: nil,
      id: "fixed-id",
      timestamp: Date(timeIntervalSince1970: 42)
    )

    XCTAssertEqual(Set(interaction.dictionary.keys), ["type", "id", "source", "timestamp", "identifier", "payload"])
    XCTAssertEqual(interaction.dictionary["type"] as? String, "interaction")
    XCTAssertEqual(interaction.dictionary["payload"] as? String, "")
    XCTAssertEqual(interaction.dictionary["timestamp"] as? Double, 42)
  }

  func testFileStorageSharesTheQueueAcrossInstancesAndRecoversFromCorruptData() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try Data("not-json".utf8).write(to: directory.appendingPathComponent(VoltraInteractionFileStorage.queueFileName))

    let writer = makeQueue(storage: VoltraInteractionFileStorage(directoryURL: directory))
    let reader = makeQueue(storage: VoltraInteractionFileStorage(directoryURL: directory))
    XCTAssertTrue(writer.record(tap("a", at: 0)))

    XCTAssertEqual(reader.pop().map(\.identifier), ["a"])
    XCTAssertEqual(writer.pop(), [])
    XCTAssertTrue(
      try FileManager.default.contentsOfDirectory(atPath: directory.path).contains { $0.contains(".corrupt-") }
    )
  }

  func testFileStorageSerializesConcurrentWritersAndReaders() {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    let writers = (0 ..< 20).map { _ in makeQueue(storage: VoltraInteractionFileStorage(directoryURL: directory)) }
    let reader = makeQueue(storage: VoltraInteractionFileStorage(directoryURL: directory))
    let lock = NSLock()
    var popped: [VoltraInteraction] = []

    let group = DispatchGroup()
    for (index, writer) in writers.enumerated() {
      group.enter()
      DispatchQueue.global().async {
        XCTAssertTrue(writer.record(self.tap("tap-\(index)", at: 0)))
        let taken = reader.pop()
        lock.lock()
        popped += taken
        lock.unlock()
        group.leave()
      }
    }
    XCTAssertEqual(group.wait(timeout: .now() + 5), .success)
    popped += reader.pop()

    XCTAssertEqual(popped.count, 20)
    XCTAssertEqual(Set(popped.map(\.id)).count, 20)
  }

  private func makeQueue(storage: VoltraInteractionStorage = VoltraInteractionMemoryStorage()) -> VoltraInteractionQueue {
    VoltraInteractionQueue(storage: storage, now: { [now] in now })
  }

  private func tap(_ identifier: String, source: String = "order-123", at offset: TimeInterval) -> VoltraInteraction {
    VoltraInteraction(source: source, identifier: identifier, payload: nil, timestamp: now.addingTimeInterval(offset))
  }
}
