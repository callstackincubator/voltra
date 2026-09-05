@testable import VoltraSharedCore
import XCTest

/// What `setWidgetServerUpdate` sends over the bridge, and what it becomes on this side.
final class WidgetServerUpdateSettingsJsonTests: XCTestCase {
  private func parsed(_ json: String) -> WidgetServerUpdateSettings {
    guard case let .parsed(settings) = WidgetServerUpdateSettingsJson.parse(json) else {
      XCTFail("expected \(json) to parse")
      return .empty
    }

    return settings
  }

  func testReadsEveryFieldAnAppCanSet() {
    let settings = parsed("""
    {
      "url": "https://api.example.com/p",
      "intervalMinutes": 30,
      "enabled": false,
      "method": "POST",
      "query": {"account": "1"},
      "headers": {"Authorization": "Bearer t"},
      "body": {"ids": [1, 2]}
    }
    """)

    XCTAssertEqual(settings.url, "https://api.example.com/p")
    XCTAssertEqual(settings.intervalMinutes, 30)
    XCTAssertEqual(settings.enabled, false)
    XCTAssertEqual(settings.method, "POST")
    XCTAssertEqual(settings.query, ["account": "1"])
    XCTAssertEqual(settings.headers, ["Authorization": "Bearer t"])
    XCTAssertEqual(settings.body, #"{"ids":[1,2]}"#)
  }

  func testLeavesOutWhatTheAppDidNotSetSoThoseLayersStaySilent() {
    let settings = parsed(#"{"url":"https://a"}"#)

    XCTAssertNil(settings.intervalMinutes)
    XCTAssertNil(settings.enabled)
    XCTAssertNil(settings.method)
    XCTAssertNil(settings.query)
    XCTAssertNil(settings.headers)
    XCTAssertNil(settings.body)
  }

  func testAnEmptyObjectClearsNothingAndSetsNothing() {
    XCTAssertTrue(parsed("{}").isEmpty)
  }

  func testDistinguishesAnExplicitlyEmptyHeaderMapFromAnAbsentOne() {
    XCTAssertEqual(parsed(#"{"headers":{}}"#).headers, [:])
    XCTAssertNil(parsed("{}").headers)
  }

  func testUppercasesTheMethodSoALowercaseOneStillValidates() {
    XCTAssertEqual(parsed(#"{"method":"patch"}"#).method, "PATCH")
  }

  func testKeepsANonObjectBodyWhichIsLegalJsonForARequest() {
    XCTAssertEqual(parsed(#"{"body":[1,2]}"#).body, "[1,2]")
    XCTAssertEqual(parsed(#"{"body":"hello"}"#).body, "\"hello\"")
    XCTAssertEqual(parsed(#"{"body":42}"#).body, "42")
  }

  func testRejectsASettingsValueThatIsNotAJsonObject() {
    XCTAssertEqual(WidgetServerUpdateSettingsJson.parse("[]"), .invalid(reason: "settings must be a JSON object"))
    XCTAssertEqual(WidgetServerUpdateSettingsJson.parse("nope"), .invalid(reason: "settings must be a JSON object"))
  }

  func testRejectsHeadersOrQueryWhoseValuesAreNotStrings() {
    guard case .invalid = WidgetServerUpdateSettingsJson.parse(#"{"headers":{"X":1}}"#) else {
      return XCTFail("expected headers with a non-string value to be rejected")
    }

    guard case .invalid = WidgetServerUpdateSettingsJson.parse(#"{"query":[]}"#) else {
      return XCTFail("expected a non-object query to be rejected")
    }
  }
}
