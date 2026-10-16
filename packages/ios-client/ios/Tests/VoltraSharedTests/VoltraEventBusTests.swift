@testable import VoltraSharedCore
import XCTest

/// Runs without an App Group, so interactions go through the in-process queue and the relay.
final class VoltraEventBusTests: XCTestCase {
  private let bus = VoltraEventBus.shared

  override func setUp() {
    super.setUp()
    _ = bus.popInteractions(sources: nil)
  }

  func testRecordedTapSignalsAndIsPoppedOnce() {
    let signalled = expectation(description: "interactions available")
    signalled.assertForOverFulfill = false
    let token = bus.subscribe { name, _ in
      if name == VoltraEventBus.interactionsAvailableEventName {
        signalled.fulfill()
      }
    }
    defer { bus.unsubscribe(token) }

    bus.send(.interaction(source: "order-123", identifier: "pause", payload: nil))
    wait(for: [signalled], timeout: 2)

    let popped = bus.popInteractions(sources: nil)
    XCTAssertEqual(popped.map { $0["identifier"] as? String }, ["pause"])
    XCTAssertNotNil(popped.first?["id"] as? String)
    XCTAssertTrue(bus.popInteractions(sources: nil).isEmpty)
  }

  func testRestoredTapsComeBackFirstAndOnlyOnce() {
    bus.send(.interaction(source: "order-123", identifier: "first", payload: nil))
    let popped = bus.popInteractions(sources: nil)
    bus.send(.interaction(source: "order-123", identifier: "second", payload: nil))

    bus.restoreInteractions(popped)
    bus.restoreInteractions(popped)

    XCTAssertEqual(bus.popInteractions(sources: nil).map { $0["identifier"] as? String }, ["first", "second"])
  }

  func testPopBySourceLeavesOtherTaps() {
    bus.send(.interaction(source: "order-123", identifier: "live-activity", payload: nil))
    bus.send(.interaction(source: "voltra-view-1", identifier: "view", payload: nil))

    XCTAssertEqual(bus.popInteractions(sources: ["voltra-view-1"]).map { $0["identifier"] as? String }, ["view"])
    XCTAssertEqual(bus.popInteractions(sources: nil).map { $0["identifier"] as? String }, ["live-activity"])
  }

  func testTearingDownOneSubscriptionKeepsTheOther() {
    let delivered = expectation(description: "replacement still receives events")
    let stale = bus.subscribe { _, _ in XCTFail("an unsubscribed handler received an event") }
    let replacement = bus.subscribe { name, _ in
      if name == "stateChange" {
        delivered.fulfill()
      }
    }
    defer { bus.unsubscribe(replacement) }

    // The old instance is torn down after its replacement subscribed, as during a reload.
    bus.unsubscribe(stale)
    bus.send(.stateChange(activityName: "order-123", state: "active"))

    wait(for: [delivered], timeout: 2)
  }

  func testDiscardsTheQueueLeftByEarlierReleases() throws {
    let suite = "voltra-tests-\(UUID().uuidString)"
    let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    defaults.set(["{\"type\":\"interaction\"}"], forKey: VoltraInteractionReporter.legacyQueueKey)

    VoltraInteractionReporter.discardLegacyQueue(in: defaults)

    XCTAssertNil(defaults.object(forKey: VoltraInteractionReporter.legacyQueueKey))
  }

  func testDarwinNotificationNamesAreScopedToTheAppGroup() {
    XCTAssertEqual(
      VoltraDarwinNotificationRelay.scoped("com.voltra.interactions", groupIdentifier: "group.com.example"),
      "com.voltra.interactions.group.com.example"
    )
  }
}
