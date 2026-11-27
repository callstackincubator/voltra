@testable import VoltraSharedCore
import XCTest

final class WidgetServerSettingsStoreTests: XCTestCase {
  func testAnInstanceScopeUsesItsWidgetsAccount() {
    XCTAssertEqual(
      WidgetServerSettingsStore.account(for: .instance(id: "weather", key: "k1")),
      WidgetServerSettingsStore.account(for: .widget(id: "weather"))
    )
  }
}
