@testable import VoltraSharedCore
import XCTest

/// `setWidgetParameterOptions` sends `JSON.stringify(options)` across the bridge, and the generated
/// `EntityQuery` reads back what was stored. Both sides depend on this shape.
final class WidgetParameterOptionTests: XCTestCase {
  func testDecodesTheOptionsTheJSSideSends() throws {
    let json = #"[{"value":"3","title":"Demo Masjid"},{"title":"Al-Shareef","value":"4"}]"#

    let options = try JSONDecoder().decode([WidgetParameterOption].self, from: Data(json.utf8))

    XCTAssertEqual(options, [
      WidgetParameterOption(value: "3", title: "Demo Masjid"),
      WidgetParameterOption(value: "4", title: "Al-Shareef"),
    ])
  }

  func testRoundTripsThroughTheStoredJSONInOrder() throws {
    let options = [
      WidgetParameterOption(value: "b", title: "Second alphabetically, first here"),
      WidgetParameterOption(value: "a", title: "A"),
    ]

    let stored = try JSONEncoder().encode(options)

    XCTAssertEqual(try JSONDecoder().decode([WidgetParameterOption].self, from: stored), options)
  }

  func testRejectsAnOptionWithoutATitle() {
    let json = #"[{"value":"3"}]"#

    XCTAssertThrowsError(try JSONDecoder().decode([WidgetParameterOption].self, from: Data(json.utf8)))
  }

  func testChecksTheTargetWidgetAndParameter() {
    func check(_ widgetId: String, _ parameter: String) -> WidgetParameterOptionsTargetError? {
      WidgetParameterOptionsTargetError.check(
        widgetId: widgetId,
        parameter: parameter,
        widgetIds: ["prayer", "prayer_times", "payload"],
        dynamicWidgetParameters: ["prayer": ["masjid"], "prayer_times": []]
      )
    }

    XCTAssertNil(check("prayer", "masjid"))
    XCTAssertEqual(check("missing", "masjid"), .widgetNotFound(widgetId: "missing"))
    XCTAssertEqual(check("payload", "masjid"), .kindMismatch(widgetId: "payload"))
    XCTAssertEqual(check("prayer", "typo"), .parameterNotDeclared(widgetId: "prayer", parameter: "typo"))
    XCTAssertEqual(check("prayer_times", "masjid"), .parameterNotDeclared(widgetId: "prayer_times", parameter: "masjid"))
  }

  func testATargetErrorCarriesTheCodeTheBridgeMaps() {
    let error = WidgetParameterOptionsTargetError.parameterNotDeclared(widgetId: "w", parameter: "p") as NSError

    XCTAssertEqual(error.domain, "com.callstack.voltra.widgetParameterOptions")
    XCTAssertEqual(error.code, 3)
  }
}
