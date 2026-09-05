@testable import VoltraSharedCore
import XCTest

/// The two response headers that move the next fetch. Parsing only: the clamp and the rescheduling
/// they feed are pinned down by `DynamicWidgetServerUpdateRunnerTests`.
final class WidgetServerFetcherHeaderTests: XCTestCase {
  func testReadsMaxAgeOutOfACacheControlHeaderWhateverElseItCarries() {
    XCTAssertEqual(WidgetServerFetcher.maxAgeMinutes("max-age=1800"), 30)
    XCTAssertEqual(WidgetServerFetcher.maxAgeMinutes("public, max-age=1800, must-revalidate"), 30)
    XCTAssertEqual(WidgetServerFetcher.maxAgeMinutes("Max-Age = 1800"), 30)
  }

  func testRoundsMaxAgeDownSoWeNeverClaimDataIsFresherThanTheServerSaid() {
    XCTAssertEqual(WidgetServerFetcher.maxAgeMinutes("max-age=119"), 1)
    XCTAssertEqual(WidgetServerFetcher.maxAgeMinutes("max-age=30"), 0)
  }

  func testIgnoresACacheControlHeaderWithNoMaxAge() {
    XCTAssertNil(WidgetServerFetcher.maxAgeMinutes(nil))
    XCTAssertNil(WidgetServerFetcher.maxAgeMinutes("no-store"))
    XCTAssertNil(WidgetServerFetcher.maxAgeMinutes("max-age=soon"))
  }

  func testRoundsRetryAfterUpSoWeNeverRetryBeforeTheServerAskedUsTo() {
    XCTAssertEqual(WidgetServerFetcher.retryAfterMinutes("1"), 1)
    XCTAssertEqual(WidgetServerFetcher.retryAfterMinutes("60"), 1)
    XCTAssertEqual(WidgetServerFetcher.retryAfterMinutes("61"), 2)
  }

  func testReadsRetryAfterAsAnHttpDateWhichServersSendAsOftenAsSeconds() {
    let asked = Date(timeIntervalSince1970: 1_445_412_480) // 2015-10-21T07:28:00Z
    let now = asked.addingTimeInterval(-90)

    XCTAssertEqual(WidgetServerFetcher.retryAfterMinutes("Wed, 21 Oct 2015 07:28:00 GMT", now: now), 2)
  }

  func testIgnoresARetryAfterAlreadyInThePastOrOneWeCannotReadAtAll() {
    XCTAssertNil(WidgetServerFetcher.retryAfterMinutes(nil))
    XCTAssertNil(WidgetServerFetcher.retryAfterMinutes("soon"))
    XCTAssertNil(WidgetServerFetcher.retryAfterMinutes("0"))
    XCTAssertNil(
      WidgetServerFetcher.retryAfterMinutes(
        "Wed, 21 Oct 2015 07:28:00 GMT",
        now: Date(timeIntervalSince1970: 1_445_412_540)
      )
    )
  }

  func testReportsTheDeviceLocaleAsABcp47TagSoBothPlatformsAgree() {
    XCTAssertEqual(VoltraWidgetServer.bcp47Locale(Locale(identifier: "en_US")), "en-US")
    XCTAssertEqual(VoltraWidgetServer.bcp47Locale(Locale(identifier: "pt_BR")), "pt-BR")
  }
}
