import Foundation
@testable import VoltraSharedCore
import XCTest

final class VoltraJSRendererFailureTests: XCTestCase {
  private func bundle(render: String) -> String {
    "var __r = function () { return { render: \(render) }; };\n__r(0);"
  }

  func testRenderSuccessReturnsTheString() throws {
    let id = "ok-\(UUID().uuidString)"
    try VoltraJSRenderer.evaluateBundle(source: bundle(render: "function (p, e) { return '{\"type\":\"empty\"}'; }"), widgetId: id).get()
    XCTAssertEqual(VoltraJSRenderer.render(widgetId: id, propsJSON: "{}", envJSON: "{}"), .success(#"{"type":"empty"}"#))
  }

  func testAThrowingRenderCarriesTheJSMessageAndStack() throws {
    let id = "throws-\(UUID().uuidString)"
    try VoltraJSRenderer.evaluateBundle(
      source: bundle(render: "function renderInbox(p, e) { throw new TypeError('Cannot read property map of undefined'); }"),
      widgetId: id
    ).get()

    guard case let .failure(failure) = VoltraJSRenderer.render(widgetId: id, propsJSON: "{}", envJSON: "{}") else {
      return XCTFail("render() threw, so the outcome must be a failure")
    }
    XCTAssertEqual(failure.stage, .render)
    XCTAssertEqual(failure.message, "TypeError: Cannot read property map of undefined")
    XCTAssertTrue(failure.stack?.contains("renderInbox") ?? false, "stack: \(failure.stack ?? "nil")")
    // Frames carry a location, which the dev error view shows: `renderInbox@voltra/<id>.bundle:<line>:<col>`.
    XCTAssertTrue(failure.stack?.contains("voltra/\(id).bundle:") ?? false, "stack: \(failure.stack ?? "nil")")
  }

  func testANonStringReturnNamesTheReturnedType() throws {
    let id = "number-\(UUID().uuidString)"
    try VoltraJSRenderer.evaluateBundle(source: bundle(render: "function () { return 42; }"), widgetId: id).get()
    guard case let .failure(failure) = VoltraJSRenderer.render(widgetId: id, propsJSON: "{}", envJSON: "{}") else {
      return XCTFail("a number is not a render result")
    }
    XCTAssertEqual(failure.stage, .render)
    XCTAssertTrue(failure.message.contains("a number"))
  }

  func testABundleThatThrowsWhileEvaluatingIsAnEvaluateFailureWithItsStack() {
    let source = "var __r = function () { throw new Error('module blew up'); };\n__r(0);"
    guard case let .failure(failure) = VoltraJSRenderer.evaluateBundle(source: source, widgetId: "eval-\(UUID().uuidString)") else {
      return XCTFail("the bundle throws")
    }
    XCTAssertEqual(failure.stage, .evaluate)
    XCTAssertEqual(failure.message, "Error: module blew up")
    XCTAssertNotNil(failure.stack)
  }

  func testABundleWithoutRenderIsAnEvaluateFailure() {
    let source = "var __r = function () { return {}; };\n__r(0);"
    guard case let .failure(failure) = VoltraJSRenderer.evaluateBundle(source: source, widgetId: "norender-\(UUID().uuidString)") else {
      return XCTFail("no render export")
    }
    XCTAssertEqual(failure.stage, .evaluate)
    XCTAssertTrue(failure.message.contains("render()"))
  }

  func testRenderingAnUnevaluatedWidgetIsARenderFailure() {
    guard case let .failure(failure) = VoltraJSRenderer.render(widgetId: "never-\(UUID().uuidString)", propsJSON: "{}", envJSON: "{}") else {
      return XCTFail("nothing was evaluated")
    }
    XCTAssertEqual(failure.stage, .render)
  }

  func testALiveActivityBundleThatThrowsWhileEvaluatingFailsEvenAfterAGoodEvaluation() {
    let id = "la-\(UUID().uuidString)"
    XCTAssertTrue(VoltraJSRenderer.evaluateLiveActivityBundle(
      source: bundle(render: "function () { return '{\"type\":\"empty\"}'; }"),
      definitionId: id
    ))

    // Before the exception handler stored the exception on the context, this throw went unnoticed
    // and the previous render() stayed in place. It is a failure now, and the message is unchanged.
    let throwing = "var __r = function () { throw new Error('module blew up'); };\n__r(0);"
    XCTAssertFalse(VoltraJSRenderer.evaluateLiveActivityBundle(source: throwing, definitionId: id))
  }
}
