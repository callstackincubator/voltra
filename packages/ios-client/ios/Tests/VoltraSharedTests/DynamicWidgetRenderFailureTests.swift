import Foundation
@testable import VoltraSharedCore
import XCTest

final class DynamicWidgetRenderFailureTests: XCTestCase {
  // MARK: - Bundle messages

  func testMetroHTTPUsesTheErrorFieldOfTheJSONBody() {
    let body = Data(#"{"error":"Unable to resolve module ./missing","type":"UnableToResolveError"}"#.utf8)
    XCTAssertEqual(
      DynamicWidgetBundleFailureMessage.metroHTTP(code: 500, url: "http://localhost:8081/x.bundle", body: body),
      "Metro HTTP 500 for http://localhost:8081/x.bundle: Unable to resolve module ./missing"
    )
  }

  func testMetroHTTPTruncatesLongBodiesAndFallsBackToRawText() {
    let long = Data(String(repeating: "a", count: 2000).utf8)
    let message = DynamicWidgetBundleFailureMessage.metroHTTP(code: 502, url: "u", body: long)
    XCTAssertEqual(message, "Metro HTTP 502 for u: " + String(repeating: "a", count: 512))
    XCTAssertEqual(DynamicWidgetBundleFailureMessage.metroHTTP(code: 404, url: "u", body: nil), "Metro HTTP 404 for u")
  }

  func testMetroUnreachableAndMissingAssetNameTheHostAndPath() {
    XCTAssertEqual(
      DynamicWidgetBundleFailureMessage.metroUnreachable(host: "localhost:8081", cause: "Could not connect"),
      "Metro unreachable at localhost:8081: Could not connect"
    )
    XCTAssertTrue(
      DynamicWidgetBundleFailureMessage.missingBakedAsset(path: "voltra-widget-inbox.bundle")
        .contains("voltra-widget-inbox.bundle")
    )
  }

  // MARK: - Shown content

  func testShownContentPolicyDevVersusRelease() {
    let failure = DynamicWidgetRenderFailure(stage: .render, message: "boom")
    func resolve(isDev: Bool, lastGood: String?, placeholder: String?) -> DynamicWidgetShownContent<String> {
      .resolve(isDev: isDev, result: .failure(failure), lastGood: { lastGood }, placeholder: { placeholder })
    }

    // Dev: always the error view, even with a last good render and a placeholder.
    guard case .devError(failure) = resolve(isDev: true, lastGood: "good", placeholder: "ph") else {
      return XCTFail("dev must show the error view")
    }
    guard case .lastGood("good") = resolve(isDev: false, lastGood: "good", placeholder: "ph") else {
      return XCTFail("release prefers the last good render")
    }
    guard case .placeholder("ph") = resolve(isDev: false, lastGood: nil, placeholder: "ph") else {
      return XCTFail("release falls back to the placeholder")
    }
    guard case .loading = resolve(isDev: false, lastGood: nil, placeholder: nil) else {
      return XCTFail("release with nothing shows the spinner")
    }
  }

  func testShownContentShowsTheNodeOnSuccessInEveryBuild() {
    for isDev in [true, false] {
      let shown = DynamicWidgetShownContent<String>.resolve(
        isDev: isDev, result: .success("node"), lastGood: { "old" }, placeholder: { "ph" }
      )
      guard case .node("node") = shown else { return XCTFail("success must show the node") }
    }
  }

  // MARK: - Failure log

  func testLogsEachFailureAndOnlyOneRecoveryPerWidgetAndFamily() {
    var lines: [(DynamicWidgetFailureLog.Level, String)] = []
    let log = DynamicWidgetFailureLog { lines.append(($0, $1)) }
    let failure = DynamicWidgetRenderFailure(stage: .render, message: "TypeError: x", stack: "at f (a.js:1:1)")

    log.succeeded(widgetId: "inbox", family: "systemMedium")
    XCTAssertTrue(lines.isEmpty, "a success that follows no failure logs nothing")

    log.failed(widgetId: "inbox", family: "systemMedium", failure: failure, isDev: true)
    XCTAssertEqual(lines.count, 1)
    XCTAssertEqual(lines[0].0, .error)
    XCTAssertEqual(
      lines[0].1,
      "[DynamicWidget] render failed widgetId=inbox family=systemMedium stage=render dev=true: TypeError: x\nat f (a.js:1:1)"
    )

    log.succeeded(widgetId: "inbox", family: "systemSmall")
    XCTAssertEqual(lines.count, 1, "another family has not failed, so it has nothing to recover from")

    log.succeeded(widgetId: "inbox", family: "systemMedium")
    log.succeeded(widgetId: "inbox", family: "systemMedium")
    XCTAssertEqual(lines.count, 2)
    XCTAssertEqual(lines[1].0, .info)
    XCTAssertEqual(lines[1].1, "[DynamicWidget] render recovered widgetId=inbox family=systemMedium")
  }

  func testReleaseFailureLogOmitsTheStack() {
    var lines: [String] = []
    let log = DynamicWidgetFailureLog { lines.append($1) }
    log.failed(
      widgetId: "w", family: "systemSmall",
      failure: DynamicWidgetRenderFailure(stage: .bundle, message: "gone", stack: "frame"),
      isDev: false
    )
    XCTAssertEqual(lines, ["[DynamicWidget] render failed widgetId=w family=systemSmall stage=bundle dev=false: gone"])
  }
}
