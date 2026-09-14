@testable import VoltraSharedCore
import XCTest

final class VoltraWidgetKindTests: XCTestCase {
  // MARK: - id -> kind

  func testDefaultsToThePrefixedKind() {
    XCTAssertEqual(VoltraWidgetKind.kind(for: "weather", overrides: [:]), "Voltra_Widget_weather")
  }

  func testUsesThePinnedKindWhenTheWidgetHasOne() {
    let overrides = ["streak": "StreakWidget"]

    XCTAssertEqual(VoltraWidgetKind.kind(for: "streak", overrides: overrides), "StreakWidget")
  }

  func testLeavesUnpinnedWidgetsOnTheDefaultKind() {
    // A migrated app pins the kind of the one widget that predates Voltra; the rest keep theirs.
    let overrides = ["streak": "StreakWidget"]

    XCTAssertEqual(VoltraWidgetKind.kind(for: "weather", overrides: overrides), "Voltra_Widget_weather")
  }

  // MARK: - kind -> id

  func testStripsThePrefixFromADefaultKind() {
    XCTAssertEqual(VoltraWidgetKind.widgetId(for: "Voltra_Widget_weather", overrides: [:]), "weather")
  }

  func testResolvesAPinnedKindBackToItsWidgetId() {
    // `getActiveWidgets` reports the widget id, not the kind, so the JS API stays id-based.
    let overrides = ["streak": "StreakWidget"]

    XCTAssertEqual(VoltraWidgetKind.widgetId(for: "StreakWidget", overrides: overrides), "streak")
  }

  func testIgnoresKindsThatBelongToAnotherFrameworksWidget() {
    // Orphan cleanup deletes data for every id it does not see, so a foreign kind must not map.
    XCTAssertNil(VoltraWidgetKind.widgetId(for: "SomeOtherWidget", overrides: [:]))
    XCTAssertNil(VoltraWidgetKind.widgetId(for: "SomeOtherWidget", overrides: ["streak": "StreakWidget"]))
  }

  func testPrefersAnOverrideOverThePrefixWhenAPinnedKindLooksLikeADefaultOne() {
    // Nothing stops a pre-Voltra widget from having used a `Voltra_Widget_`-shaped kind.
    let overrides = ["streak": "Voltra_Widget_legacy"]

    XCTAssertEqual(VoltraWidgetKind.widgetId(for: "Voltra_Widget_legacy", overrides: overrides), "streak")
  }

  func testStillResolvesTheFormerDefaultKindOfAWidgetThatNowPinsOne() {
    // Instances placed before the kind was pinned keep the old kind until they are re-added, and
    // orphan cleanup must not treat them as gone and delete the widget's data.
    let overrides = ["streak": "StreakWidget"]

    XCTAssertEqual(VoltraWidgetKind.widgetId(for: "Voltra_Widget_streak", overrides: overrides), "streak")
  }

  func testRoundTripsEveryWidgetIdThroughItsKind() {
    let overrides = ["streak": "StreakWidget"]

    for widgetId in ["streak", "weather"] {
      let kind = VoltraWidgetKind.kind(for: widgetId, overrides: overrides)

      XCTAssertEqual(VoltraWidgetKind.widgetId(for: kind, overrides: overrides), widgetId)
    }
  }

  // MARK: - Info.plist decoding

  func testReadsOverridesFromInfoPlist() throws {
    let bundle = try makeBundle(infoPlist: [VoltraStorageKeys.widgetKinds: ["streak": "StreakWidget"]])

    XCTAssertEqual(VoltraConfig.widgetKinds(bundle: bundle), ["streak": "StreakWidget"])
  }

  func testReadsNoOverridesWhenTheKeyIsAbsent() throws {
    // Every app that predates the `kind` option, and every app where no widget pins one.
    let bundle = try makeBundle(infoPlist: ["CFBundleShortVersionString": "1.2.3"])

    XCTAssertEqual(VoltraConfig.widgetKinds(bundle: bundle), [:])
  }

  func testDropsUnusableOverrideValues() {
    // Generation would have to have gone wrong; falling back to the default kind beats crashing.
    XCTAssertEqual(VoltraConfig.normalizeWidgetKinds(nil), [:])
    XCTAssertEqual(VoltraConfig.normalizeWidgetKinds("StreakWidget"), [:])
    XCTAssertEqual(VoltraConfig.normalizeWidgetKinds(["streak": 3]), [:])
    XCTAssertEqual(VoltraConfig.normalizeWidgetKinds(["streak": ""]), [:])
    XCTAssertEqual(
      VoltraConfig.normalizeWidgetKinds(["streak": "StreakWidget", "weather": 3]),
      ["streak": "StreakWidget"]
    )
  }

  /// Builds a throwaway bundle on disk so the Info.plist lookup runs for real rather than against
  /// a stubbed `Bundle`.
  private func makeBundle(infoPlist: [String: Any]) throws -> Bundle {
    let bundlePath = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("voltra-widget-kind-tests-\(UUID().uuidString)")
      .appendingPathComponent("Stub.bundle")

    try FileManager.default.createDirectory(at: bundlePath, withIntermediateDirectories: true)
    addTeardownBlock {
      try? FileManager.default.removeItem(at: bundlePath.deletingLastPathComponent())
    }

    let data = try PropertyListSerialization.data(fromPropertyList: infoPlist, format: .xml, options: 0)
    try data.write(to: bundlePath.appendingPathComponent("Info.plist"))

    return try XCTUnwrap(Bundle(url: bundlePath))
  }
}
