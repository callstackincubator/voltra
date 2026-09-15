import Foundation
@testable import VoltraSharedCore
import XCTest

final class ServerWidgetContentResolverTests: XCTestCase {
  private struct FetchFailure: Error, Equatable {}

  /// Deterministic clock and fetch double shared by the tests.
  private final class Harness {
    var currentDate = Date(timeIntervalSince1970: 1_000_000)
    var responses: [Result<Data, FetchFailure>] = []
    private(set) var fetchedWidgetIds: [String] = []
    let store = ServerWidgetResponseStore()

    func makeResolver(coalesceInterval: TimeInterval = 3) -> ServerWidgetContentResolver {
      ServerWidgetContentResolver(
        responseStore: store,
        fetch: { [unowned self] widgetId in
          fetchedWidgetIds.append(widgetId)
          return try responses.removeFirst().get()
        },
        coalesceInterval: coalesceInterval,
        now: { [unowned self] in currentDate }
      )
    }

    func advance(by seconds: TimeInterval) {
      currentDate = currentDate.addingTimeInterval(seconds)
    }
  }

  private let first = Data("first".utf8)
  private let second = Data("second".utf8)

  func testFirstRequestFetchesAndReturnsCurrentContent() async throws {
    let harness = Harness()
    harness.responses = [.success(first)]

    let outcome = await harness.makeResolver().resolve(widgetId: "portfolio")

    XCTAssertEqual(try outcome.currentData(), first)
    XCTAssertEqual(harness.fetchedWidgetIds, ["portfolio"])
  }

  func testBurstOfRequestsWithinCoalesceWindowSharesOneFetch() async throws {
    // A refresh-button tap yields two timeline requests in quick succession; both must
    // render the response the server just sent, and only one request may hit the server.
    let harness = Harness()
    harness.responses = [.success(first)]
    let resolver = harness.makeResolver()

    let fromTap = await resolver.resolve(widgetId: "portfolio")
    harness.advance(by: 0.5)
    let fromAutomaticReload = await resolver.resolve(widgetId: "portfolio")

    XCTAssertEqual(try fromTap.currentData(), first)
    XCTAssertEqual(try fromAutomaticReload.currentData(), first)
    XCTAssertEqual(harness.fetchedWidgetIds.count, 1)
  }

  func testFetchesAgainOnceCoalesceWindowHasPassed() async throws {
    let harness = Harness()
    harness.responses = [.success(first), .success(second)]
    let resolver = harness.makeResolver(coalesceInterval: 3)

    _ = await resolver.resolve(widgetId: "portfolio")
    harness.advance(by: 3)
    let outcome = await resolver.resolve(widgetId: "portfolio")

    XCTAssertEqual(try outcome.currentData(), second)
    XCTAssertEqual(harness.fetchedWidgetIds.count, 2)
  }

  func testFailedFetchReturnsLastKnownResponse() async {
    let harness = Harness()
    harness.responses = [.success(first), .failure(FetchFailure())]
    let resolver = harness.makeResolver()

    _ = await resolver.resolve(widgetId: "portfolio")
    harness.advance(by: 60)
    let outcome = await resolver.resolve(widgetId: "portfolio")

    guard case let .lastKnown(data, error) = outcome else {
      return XCTFail("Expected lastKnown, got \(outcome)")
    }
    XCTAssertEqual(data, first)
    XCTAssertEqual(error as? FetchFailure, FetchFailure())
  }

  func testFailedFetchWithoutHistoryIsUnavailable() async {
    let harness = Harness()
    harness.responses = [.failure(FetchFailure())]

    let outcome = await harness.makeResolver().resolve(widgetId: "portfolio")

    guard case let .unavailable(error) = outcome else {
      return XCTFail("Expected unavailable, got \(outcome)")
    }
    XCTAssertEqual(error as? FetchFailure, FetchFailure())
  }

  func testFailedFetchDoesNotOverwriteLastKnownResponse() async {
    let harness = Harness()
    harness.responses = [.success(first), .failure(FetchFailure()), .failure(FetchFailure())]
    let resolver = harness.makeResolver()

    _ = await resolver.resolve(widgetId: "portfolio")
    harness.advance(by: 60)
    _ = await resolver.resolve(widgetId: "portfolio")
    harness.advance(by: 60)
    let outcome = await resolver.resolve(widgetId: "portfolio")

    guard case let .lastKnown(data, _) = outcome else {
      return XCTFail("Expected lastKnown, got \(outcome)")
    }
    XCTAssertEqual(data, first)
  }

  func testResponsesAreKeptPerWidgetId() async throws {
    let harness = Harness()
    harness.responses = [.success(first), .success(second)]
    let resolver = harness.makeResolver()

    let portfolio = await resolver.resolve(widgetId: "portfolio")
    let weather = await resolver.resolve(widgetId: "weather")

    XCTAssertEqual(try portfolio.currentData(), first)
    XCTAssertEqual(try weather.currentData(), second)
    XCTAssertEqual(harness.fetchedWidgetIds, ["portfolio", "weather"])
  }
}

private struct UnexpectedOutcome: Error {
  let outcome: ServerWidgetContentResolver.Outcome
}

private extension ServerWidgetContentResolver.Outcome {
  func currentData() throws -> Data {
    guard case let .current(data) = self else {
      throw UnexpectedOutcome(outcome: self)
    }
    return data
  }
}
