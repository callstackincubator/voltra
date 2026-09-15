@testable import VoltraSharedCore
import XCTest

final class WidgetServerSettingsValidatorTests: XCTestCase {
  private func validate(_ settings: WidgetServerUpdateSettings, isDebugBuild: Bool = false) -> String? {
    WidgetServerSettingsValidator.validate(settings, isDebugBuild: isDebugBuild)
  }

  func testAcceptsHttpsAnywhere() {
    XCTAssertNil(validate(.init(url: "https://api.example.com/portfolio")))
  }

  func testRejectsPlainHttpInAReleaseBuildEvenForALocalHost() {
    XCTAssertNotNil(validate(.init(url: "http://localhost:3333")))
  }

  func testAcceptsPlainHttpToADevHostInADebugBuild() {
    XCTAssertNil(validate(.init(url: "http://localhost:3333"), isDebugBuild: true))
    XCTAssertNil(validate(.init(url: "http://127.0.0.1:3333/widgets"), isDebugBuild: true))
  }

  func testRejectsPlainHttpToAnotherHostEvenInADebugBuild() {
    XCTAssertNotNil(validate(.init(url: "http://api.example.com"), isDebugBuild: true))
  }

  func testRejectsAUrlWithNoSchemeOrNoHost() {
    XCTAssertNotNil(validate(.init(url: "api.example.com/portfolio")))
    XCTAssertNotNil(validate(.init(url: "   ")))
  }

  func testRejectsAQueryKeyVoltraAlreadySends() {
    XCTAssertTrue(validate(.init(query: ["theme": "dark"]))?.contains("reserved") == true)
  }

  func testRejectsAnInstanceKeyReservedForPerPlacementFetches() {
    XCTAssertNotNil(validate(.init(query: ["instance": "1"])))
  }

  func testRejectsAMethodNeitherPlatformCanSend() {
    XCTAssertNotNil(validate(.init(method: "TRACE")))
    XCTAssertNil(validate(.init(method: "patch")))
  }

  func testRejectsANonPositiveInterval() {
    XCTAssertNotNil(validate(.init(intervalMinutes: 0)))
    XCTAssertNotNil(validate(.init(intervalMinutes: -5)))
  }

  func testAcceptsABodyWithGetWhichTheRequestBuilderDropsWithAWarning() {
    XCTAssertNil(validate(.init(method: "GET", body: #"{"a":1}"#)))
  }

  func testRejectsALayerLargerThanTheStorageCap() {
    let huge = String(repeating: "x", count: WidgetServerUpdateDefaults.maxLayerBytes + 1)

    XCTAssertNotNil(validate(.init(body: huge)))
  }
}
