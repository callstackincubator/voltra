@testable import VoltraSharedCore
import XCTest

final class WidgetServerSettingsCodecTests: XCTestCase {
  func testRoundTripsEveryField() {
    let settings = WidgetServerUpdateSettings(
      url: "https://api.example.com/portfolio",
      intervalMinutes: 30,
      enabled: false,
      method: "POST",
      query: ["account": "1", "range": "1d"],
      headers: ["Authorization": "Bearer token"],
      body: #"{"ids":[1,2]}"#
    )

    XCTAssertEqual(WidgetServerSettingsCodec.decode(WidgetServerSettingsCodec.encode(settings)), settings)
  }

  func testKeepsUnsetFieldsUnsetSoALayerThatSaysNothingStaysSilent() {
    let decoded = WidgetServerSettingsCodec.decode(
      WidgetServerSettingsCodec.encode(WidgetServerUpdateSettings(url: "https://a"))
    )

    XCTAssertEqual(decoded?.url, "https://a")
    XCTAssertNil(decoded?.intervalMinutes)
    XCTAssertNil(decoded?.enabled)
    XCTAssertNil(decoded?.method)
    XCTAssertNil(decoded?.headers)
    XCTAssertNil(decoded?.query)
    XCTAssertNil(decoded?.body)
  }

  func testDistinguishesEnabledFalseFromUnset() {
    let decoded = WidgetServerSettingsCodec.decode(
      WidgetServerSettingsCodec.encode(WidgetServerUpdateSettings(enabled: false))
    )

    XCTAssertEqual(decoded?.enabled, false)
  }

  func testReadsAnUnknownVersionOrABrokenRecordAsNoOpinion() {
    XCTAssertNil(WidgetServerSettingsCodec.decode(nil))
    XCTAssertNil(WidgetServerSettingsCodec.decode(Data("not json".utf8)))
    XCTAssertNil(
      WidgetServerSettingsCodec.decode(
        Data(#"{"widgetServerSettingsVersion":99,"widgetServerSettings":{}}"#.utf8)
      )
    )
  }
}
