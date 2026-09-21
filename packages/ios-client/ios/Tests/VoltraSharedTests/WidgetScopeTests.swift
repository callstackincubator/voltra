@testable import VoltraSharedCore
import XCTest

final class WidgetScopeTests: XCTestCase {
  func testWidgetStorageKeyIsTheBareWidgetId() {
    XCTAssertEqual(WidgetScope.widget(id: "weather").storageKey, "weather")
  }

  func testInstanceStorageKeyAppendsTheKeySoWidgetScopedRecordsWrittenTodayKeepTheirKeys() {
    let scope = WidgetScope.instance(id: "weather", key: "eb69b5d1")

    XCTAssertEqual(scope.storageKey, "weather#eb69b5d1")
    XCTAssertEqual(scope.widgetId, "weather")
  }

  func testOfWidgetIdConfigurationResolvesToWidgetForAnEmptyConfiguration() {
    let scope = WidgetScope.of("weather", configuration: [:])

    guard case .widget = scope else {
      return XCTFail("expected .widget, got \(scope)")
    }
    XCTAssertEqual(scope.storageKey, "weather")
  }

  func testOfWidgetIdConfigurationResolvesToInstanceForANonEmptyConfiguration() {
    let scope = WidgetScope.of("weather", configuration: ["city": "London", "units": "metric"])

    guard case let .instance(id, key) = scope else {
      return XCTFail("expected .instance, got \(scope)")
    }
    XCTAssertEqual(id, "weather")
    XCTAssertEqual(key, "eb69b5d1")
    XCTAssertEqual(scope.storageKey, "weather#eb69b5d1")
  }
}
