import Foundation
@testable import VoltraSharedCore
import XCTest

final class VoltraLocaleEnvironmentTests: XCTestCase {
  func testLocaleIsBCP47NotICU() throws {
    // ADR 0009 G1: `Locale.identifier` gives `pl_PL`, which `Intl` rejects with a RangeError.
    let env = try VoltraLocaleEnvironment.capture(
      locale: Locale(identifier: "pl_PL"),
      preferredLanguages: ["pl-PL", "en-US"],
      timeZone: XCTUnwrap(TimeZone(identifier: "Europe/Warsaw"))
    )

    XCTAssertEqual(env.locale, "pl-PL")
    XCTAssertFalse(env.locale.contains("_"))
    XCTAssertEqual(env.preferredLanguages, ["pl-PL", "en-US"])
    XCTAssertEqual(env.timeZone, "Europe/Warsaw")
    XCTAssertEqual(env.calendar, "gregory")
    XCTAssertEqual(env.firstDayOfWeek, 2)
    XCTAssertEqual(env.measurementSystem, "metric")
    XCTAssertEqual(env.layoutDirection, "ltr")
    XCTAssertNil(env.appLocale)
  }

  func testHourCycleFollowsTheLocaleOverride() {
    let twelve = VoltraLocaleEnvironment.capture(locale: Locale(identifier: "en_US"))
    // Built through Locale.Components rather than a BCP-47 string, whose extension parsing through
    // Locale(identifier:) is not documented. This is how the 24-Hour Time override arrives.
    var components = Locale.Components(identifier: "en_US")
    components.hourCycle = .zeroToTwentyThree
    let twentyFour = VoltraLocaleEnvironment.capture(locale: Locale(components: components))

    XCTAssertEqual(twelve.hourCycle, "h12")
    XCTAssertEqual(twentyFour.hourCycle, "h23")
    // The override must reach JS inside the tag too, so Intl formats 24-hour on its own. Verified
    // on-device by ADR 0009 test T7.
    XCTAssertEqual(twentyFour.locale, "en-US-u-hc-h23")
  }

  func testRegionalFormats() {
    let us = VoltraLocaleEnvironment.capture(locale: Locale(identifier: "en_US"))
    let uk = VoltraLocaleEnvironment.capture(locale: Locale(identifier: "en_GB"))
    var japaneseComponents = Locale.Components(identifier: "ja_JP")
    japaneseComponents.calendar = .japanese
    let japanese = VoltraLocaleEnvironment.capture(locale: Locale(components: japaneseComponents))

    XCTAssertEqual(us.measurementSystem, "us")
    XCTAssertEqual(us.firstDayOfWeek, 1)
    XCTAssertEqual(uk.measurementSystem, "uk")
    XCTAssertEqual(japanese.calendar, "japanese")
    XCTAssertEqual(japanese.locale, "ja-JP-u-ca-japanese")
  }

  func testLayoutDirectionPrefersSwiftUIAndFallsBackToScript() {
    XCTAssertEqual(VoltraLocaleEnvironment.capture(locale: Locale(identifier: "ar_EG")).layoutDirection, "rtl")
    XCTAssertEqual(
      VoltraLocaleEnvironment.capture(locale: Locale(identifier: "ar_EG"), isRightToLeft: false).layoutDirection,
      "ltr"
    )
  }

  func testCalendarIdentifiersUseIntlSpelling() {
    XCTAssertEqual(VoltraLocaleEnvironment.calendarIdentifier("gregorian"), "gregory")
    XCTAssertEqual(VoltraLocaleEnvironment.calendarIdentifier("ethiopic-amete-alem"), "ethioaa")
    XCTAssertEqual(VoltraLocaleEnvironment.calendarIdentifier("buddhist"), "buddhist")
    XCTAssertNil(VoltraLocaleEnvironment.calendarIdentifier(""))
  }

  func testJSONFieldsParseAndOmitAbsentValues() throws {
    let env = VoltraLocaleEnvironment(
      locale: "pl-PL",
      preferredLanguages: ["pl-PL", "en"],
      appLocale: "de",
      layoutDirection: "ltr",
      hourCycle: "h23",
      timeZone: "Europe/Warsaw",
      measurementSystem: nil,
      calendar: nil,
      firstDayOfWeek: 2
    )

    let parsed = try JSONValue.parse(from: "{\n  \(env.jsonFields)\n}")
    let expected = try JSONValue.parse(from: #"""
    {"locale":"pl-PL","preferredLanguages":["pl-PL","en"],"appLocale":"de","layoutDirection":"ltr",
     "hourCycle":"h23","timeZone":"Europe/Warsaw","firstDayOfWeek":2}
    """#)
    XCTAssertEqual(parsed, expected)
  }

  func testEmptyAppLocaleIsTreatedAsUnset() {
    let env = VoltraLocaleEnvironment.capture(locale: Locale(identifier: "en_US"), appLocale: "")
    XCTAssertNil(env.appLocale)
    XCTAssertFalse(env.jsonFields.contains("appLocale"))
  }
}
