import Foundation
@testable import VoltraSharedCore
import XCTest

final class VoltraJSRendererTimelineTests: XCTestCase {
  private func bundle(timeline: String?) -> String {
    let timelineExport = timeline.map { ", timeline: \($0)" } ?? ""
    return "var __r = function () { return { render: function () { return '{}'; }\(timelineExport) }; };\n__r(0);"
  }

  private func evaluate(timeline: String?) throws -> String {
    let id = "timeline-\(UUID().uuidString)"
    try VoltraJSRenderer.evaluateBundle(source: bundle(timeline: timeline), widgetId: id).get()
    return id
  }

  func testReturnsTheDatesTheTimelineExportGivesForTheProps() throws {
    let id = try evaluate(timeline: "function (p) { return JSON.stringify(JSON.parse(p).startsAt); }")

    let dates = VoltraJSRenderer.timelineDates(widgetId: id, propsJSON: #"{"startsAt":[1700000000000,1700000060000]}"#)

    XCTAssertEqual(dates, [
      Date(timeIntervalSince1970: 1_700_000_000),
      Date(timeIntervalSince1970: 1_700_000_060),
    ])
  }

  func testIsEmptyForAWidgetWithoutATimelineExport() throws {
    let id = try evaluate(timeline: nil)

    XCTAssertEqual(VoltraJSRenderer.timelineDates(widgetId: id, propsJSON: "{}"), [])
  }

  func testIsEmptyWhenTheTimelineExportThrows() throws {
    let id = try evaluate(timeline: "function () { throw new Error('no dates'); }")

    XCTAssertEqual(VoltraJSRenderer.timelineDates(widgetId: id, propsJSON: "{}"), [])
  }

  func testIsEmptyWhenTheTimelineExportReturnsSomethingOtherThanDates() throws {
    let id = try evaluate(timeline: #"function () { return JSON.stringify({ at: 1700000000000 }); }"#)

    XCTAssertEqual(VoltraJSRenderer.timelineDates(widgetId: id, propsJSON: "{}"), [])
  }

  func testIsEmptyForAWidgetThatWasNeverEvaluated() {
    XCTAssertEqual(VoltraJSRenderer.timelineDates(widgetId: "never-\(UUID().uuidString)", propsJSON: "{}"), [])
  }
}
