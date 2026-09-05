@testable import VoltraSharedCore
import XCTest

private struct StubLayer: WidgetServerSettingsLayer {
  let name: String
  let stubbed: WidgetServerUpdateSettings?
  let serverDriven: Bool

  init(_ name: String, _ stubbed: WidgetServerUpdateSettings?, serverDriven: Bool = false) {
    self.name = name
    self.stubbed = stubbed
    self.serverDriven = serverDriven
  }

  func settings(for _: WidgetScope) -> WidgetServerUpdateSettings? {
    stubbed
  }

  func isServerDriven(_: WidgetScope) -> Bool {
    serverDriven
  }
}

/// The merge rule from ADR 0002 lives in the resolver and nowhere else, so this is where it is
/// pinned down.
final class WidgetServerSettingsResolverTests: XCTestCase {
  private let scope = WidgetScope.of("portfolio")

  private func resolver(_ layers: [any WidgetServerSettingsLayer], revision: Int = 0) -> WidgetServerSettingsResolver {
    WidgetServerSettingsResolver(layers: layers, revisionSource: { revision })
  }

  func testTakesScalarsFromTheHighestLayerThatSetsThem() {
    let resolved = resolver([
      StubLayer("config", .init(url: "https://config", intervalMinutes: 60), serverDriven: true),
      StubLayer("global", .init(url: "https://global", method: "POST")),
      StubLayer("widget", .init(url: "https://widget", body: #"{"a":1}"#)),
    ]).resolve(scope)

    XCTAssertEqual(resolved.url, "https://widget")
    XCTAssertEqual(resolved.method, "POST")
    XCTAssertEqual(resolved.body, #"{"a":1}"#)
    XCTAssertEqual(resolved.intervalMinutes, 60)
  }

  func testMergesHeadersAndQueryPerKeyRatherThanReplacingTheWholeMap() {
    let resolved = resolver([
      StubLayer("config", .init(), serverDriven: true),
      StubLayer("credentials", .init(headers: ["Authorization": "Bearer legacy", "X-Env": "prod"])),
      StubLayer("global", .init(query: ["account": "1"], headers: ["Authorization": "Bearer new"])),
      StubLayer("widget", .init(query: ["range": "1d"])),
    ]).resolve(scope)

    XCTAssertEqual(resolved.headers, ["Authorization": "Bearer new", "X-Env": "prod"])
    XCTAssertEqual(resolved.query, ["account": "1", "range": "1d"])
  }

  func testFillsInTheDefaultsAFetchNeeds() {
    let resolved = resolver([StubLayer("config", .init(url: "https://a"), serverDriven: true)]).resolve(scope)

    XCTAssertEqual(resolved.method, WidgetServerUpdateDefaults.defaultMethod)
    XCTAssertEqual(resolved.intervalMinutes, WidgetServerUpdateDefaults.defaultIntervalMinutes)
    XCTAssertTrue(resolved.enabled)
    XCTAssertTrue(resolved.query.isEmpty)
  }

  func testClampsARuntimeIntervalOverrideToWhatWidgetKitCanHonour() {
    let tooShort = resolver([
      StubLayer("config", .init(intervalMinutes: 60), serverDriven: true),
      StubLayer("widget", .init(intervalMinutes: 1)),
    ]).resolve(scope)
    let tooLong = resolver([
      StubLayer("config", .init(intervalMinutes: 60), serverDriven: true),
      StubLayer("widget", .init(intervalMinutes: 60 * 24 * 30)),
    ]).resolve(scope)

    XCTAssertEqual(tooShort.intervalMinutes, WidgetServerUpdateDefaults.minIntervalMinutes)
    XCTAssertEqual(tooLong.intervalMinutes, WidgetServerUpdateDefaults.maxIntervalMinutes)
  }

  func testLeavesAnIntervalFromAppJsonAloneSoAnExistingWidgetKeepsItsSchedule() {
    // The generators already validated this against the platform's own rules — iOS allows a
    // payload widget down to 1 minute — so clamping it again here would silently change the
    // schedule of a widget that has been shipping for months.
    let resolved = resolver([StubLayer("config", .init(intervalMinutes: 5), serverDriven: true)]).resolve(scope)

    XCTAssertEqual(resolved.intervalMinutes, 5)
  }

  func testAWidgetTheConfigLayerDoesNotKnowIsNeverFetched() {
    let resolved = resolver([
      StubLayer("config", nil),
      StubLayer("widget", .init(url: "https://sneaky", enabled: true)),
    ]).resolve(scope)

    XCTAssertNil(resolved.url)
    XCTAssertFalse(resolved.enabled)
    XCTAssertFalse(resolved.shouldFetch)
  }

  func testEnabledFalseStopsFetchingWithoutDroppingTheUrl() {
    let resolved = resolver([
      StubLayer("config", .init(url: "https://a"), serverDriven: true),
      StubLayer("widget", .init(enabled: false)),
    ]).resolve(scope)

    XCTAssertEqual(resolved.url, "https://a")
    XCTAssertFalse(resolved.shouldFetch)
  }

  func testAServerDrivenWidgetWithNoUrlYetDoesNotFetch() {
    let resolved = resolver([StubLayer("config", .init(), serverDriven: true)]).resolve(scope)

    XCTAssertNil(resolved.url)
    XCTAssertTrue(resolved.enabled)
    XCTAssertFalse(resolved.shouldFetch)
  }

  func testRevisionComesFromTheStoreSoAFetcherCanTellWhetherSettingsMoved() {
    XCTAssertEqual(resolver([StubLayer("config", nil)], revision: 7).revision(scope), 7)
  }
}
