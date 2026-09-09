@testable import VoltraSharedCore
import XCTest

/// The request contract every backend sees, pinned down without a network.
final class WidgetServerRequestBuilderTests: XCTestCase {
  private let scope = WidgetScope.of("portfolio")

  private func context(family: String? = nil) -> WidgetServerRequestContext {
    WidgetServerRequestContext(theme: "dark", locale: "en-US", userAgent: "VoltraWidget/2.2.0 (iOS/18.0)", family: family)
  }

  private func settings(
    url: String? = "https://api.example.com/widgets/portfolio",
    enabled: Bool = true,
    method: String = "GET",
    query: [String: String] = [:],
    headers: [String: String] = [:],
    body: String? = nil
  ) -> ResolvedWidgetServerSettings {
    ResolvedWidgetServerSettings(
      url: url,
      intervalMinutes: 15,
      enabled: enabled,
      method: method,
      query: query,
      headers: headers,
      body: body
    )
  }

  private func queryItems(_ request: URLRequest) -> [String: String] {
    let components = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!

    return Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).map { ($0.name, $0.value ?? "") })
  }

  func testSendsTheVoltraQueryParametersEveryBackendCanRelyOn() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(scope: scope, settings: settings(), context: context()))
    let items = queryItems(request)

    XCTAssertEqual(items["widgetId"], "portfolio")
    XCTAssertEqual(items["platform"], "ios")
    XCTAssertEqual(items["theme"], "dark")
    XCTAssertEqual(items["locale"], "en-US")
  }

  func testDoesNotSendFamilyForADynamicWidgetWhoseOneFetchServesEverySize() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(scope: scope, settings: settings(), context: context()))

    XCTAssertNil(queryItems(request)["family"])
  }

  func testStillSendsFamilyForAPayloadWidget() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(
      scope: scope,
      settings: settings(),
      context: context(family: "systemSmall")
    ))

    XCTAssertEqual(queryItems(request)["family"], "systemSmall")
  }

  func testKeepsThePathAndAnyQueryTheConfiguredUrlAlreadyHad() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(
      scope: scope,
      settings: settings(url: "https://api.example.com/widgets?tenant=acme"),
      context: context()
    ))

    XCTAssertEqual(request.url?.path, "/widgets")
    XCTAssertEqual(queryItems(request)["tenant"], "acme")
  }

  func testAppendsTheAppsOwnQueryParameters() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(
      scope: scope,
      settings: settings(query: ["account": "42"]),
      context: context()
    ))

    XCTAssertEqual(queryItems(request)["account"], "42")
  }

  func testSendsAcceptAndAVoltraUserAgentAndLetsTheAppAddHeaders() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(
      scope: scope,
      settings: settings(headers: ["Authorization": "Bearer t"]),
      context: context()
    ))

    XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
    XCTAssertEqual(request.value(forHTTPHeaderField: "User-Agent"), "VoltraWidget/2.2.0 (iOS/18.0)")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer t")
  }

  func testSendsIfNoneMatchOnlyWhenAnEtagWasCarriedOver() throws {
    let withEtag = try XCTUnwrap(WidgetServerRequestBuilder.build(scope: scope, settings: settings(), context: context(), etag: "\"abc\""))
    let without = try XCTUnwrap(WidgetServerRequestBuilder.build(scope: scope, settings: settings(), context: context()))

    XCTAssertEqual(withEtag.value(forHTTPHeaderField: "If-None-Match"), "\"abc\"")
    XCTAssertNil(without.value(forHTTPHeaderField: "If-None-Match"))
  }

  func testSendsABodyWithPostAndDeclaresItsContentType() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(
      scope: scope,
      settings: settings(method: "POST", body: #"{"a":1}"#),
      context: context()
    ))

    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
    XCTAssertEqual(request.httpBody, Data(#"{"a":1}"#.utf8))
  }

  func testDropsABodyOnGetWhichURLSessionWouldNotSendAnyway() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(
      scope: scope,
      settings: settings(method: "GET", body: #"{"a":1}"#),
      context: context()
    ))

    XCTAssertEqual(request.httpMethod, "GET")
    XCTAssertNil(request.httpBody)
    XCTAssertNil(request.value(forHTTPHeaderField: "Content-Type"))
  }

  func testUppercasesTheMethodSoALowercaseSettingStillReachesTheRightVerb() throws {
    let request = try XCTUnwrap(WidgetServerRequestBuilder.build(scope: scope, settings: settings(method: "patch"), context: context()))

    XCTAssertEqual(request.httpMethod, "PATCH")
  }

  func testBuildsNothingWhenThereIsNoUrlOrFetchingIsOff() {
    XCTAssertNil(WidgetServerRequestBuilder.build(scope: scope, settings: settings(url: nil), context: context()))
    XCTAssertNil(WidgetServerRequestBuilder.build(scope: scope, settings: settings(enabled: false), context: context()))
  }
}
