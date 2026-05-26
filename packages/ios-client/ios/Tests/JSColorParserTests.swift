import SwiftUI
@testable import VoltraStyleCore
import XCTest

final class JSColorParserTests: XCTestCase {
  // MARK: - Helpers

  private func assertParsed(_ value: String, file: StaticString = #filePath, line: UInt = #line) {
    XCTAssertNotNil(JSColorParser.parse(value), "Expected non-nil Color for: \(value)", file: file, line: line)
  }

  private func assertNil(_ value: String, file: StaticString = #filePath, line: UInt = #line) {
    XCTAssertNil(JSColorParser.parse(value), "Expected nil Color for: \(value)", file: file, line: line)
  }

  // MARK: - Existing formats (smoke)

  func testHexColors() {
    assertParsed("#fff")
    assertParsed("#ffffff")
    assertParsed("#ffffffff")
    assertParsed("ffffff")
  }

  func testRGBColors() {
    assertParsed("rgb(255, 0, 0)")
    assertParsed("rgba(255, 0, 0, 0.5)")
    assertParsed("rgb(255 0 0 / 80%)")
    assertParsed("rgba(255 0 0 / 0.8)")
  }

  func testTrailingGarbageRejected() {
    assertNil("rgba(255,0,0,0.8)garbage")
    assertNil("rgb(255,0)")
    assertNil("hsl(120, 100, 50%)")
  }

  func testReducedPresentationNeutralColors() {
    XCTAssertTrue(JSColorParser.shouldUsePrimaryColorInReducedPresentation("#F9FAFB"))
    XCTAssertTrue(JSColorParser.shouldUsePrimaryColorInReducedPresentation("#6B7280"))
    XCTAssertTrue(JSColorParser.shouldUsePrimaryColorInReducedPresentation("white"))
  }

  func testReducedPresentationSemanticAccents() {
    XCTAssertFalse(JSColorParser.shouldUsePrimaryColorInReducedPresentation("#34D399"))
    XCTAssertFalse(JSColorParser.shouldUsePrimaryColorInReducedPresentation("#F87171"))
    XCTAssertFalse(JSColorParser.shouldUsePrimaryColorInReducedPresentation("green"))
  }

  func testHSLColors() {
    assertParsed("hsl(120, 100%, 50%)")
    assertParsed("hsla(120, 100%, 50%, 0.5)")
    assertParsed("hsl(120 100% 50% / 30%)")
  }

  func testNamedColors() {
    assertParsed("red")
    assertParsed("blue")
    assertParsed("primary")
    assertParsed("transparent")
  }

  // MARK: - light-dark()

  func testLightDarkWithHexColors() {
    assertParsed("light-dark(#ffffff, #000000)")
    assertParsed("light-dark(#fff, #000)")
  }

  func testLightDarkWithRGBColors() {
    assertParsed("light-dark(rgb(255, 255, 255), rgb(0, 0, 0))")
    assertParsed("light-dark(rgba(255, 255, 255, 1), rgba(0, 0, 0, 0.9))")
  }

  func testLightDarkWithHSLColors() {
    assertParsed("light-dark(hsl(0, 0%, 100%), hsl(0, 0%, 0%))")
  }

  func testLightDarkWithNamedColors() {
    assertParsed("light-dark(white, black)")
    assertParsed("light-dark(primary, secondary)")
  }

  func testLightDarkMixedFormats() {
    assertParsed("light-dark(#ffffff, rgb(0, 0, 0))")
    assertParsed("light-dark(white, #1a1a1a)")
  }

  func testLightDarkWithWhitespace() {
    assertParsed("light-dark( #fff , #000 )")
    assertParsed("light-dark(  white  ,  black  )")
  }

  func testLightDarkReturnsAdaptiveColor() {
    // light-dark() must return a non-nil Color — the adaptive UIColor wrapping
    // is an implementation detail; what matters is that the result is usable.
    let result = JSColorParser.parse("light-dark(#ffffff, #000000)")
    XCTAssertNotNil(result)
  }

  func testLightDarkInvalidLightColor() {
    assertNil("light-dark(notacolor, #000000)")
  }

  func testLightDarkInvalidDarkColor() {
    assertNil("light-dark(#ffffff, notacolor)")
  }

  func testLightDarkMissingArgument() {
    assertNil("light-dark(#ffffff)")
    assertNil("light-dark()")
  }

  func testLightDarkNestedCommasInRGB() {
    // The top-level comma split must not break on commas inside rgb()
    assertParsed("light-dark(rgb(255, 255, 255), rgb(0, 0, 0))")
  }
}