import XCTest
@testable import Voltra

final class JSGradientParserTests: XCTestCase {
  func testLinearGradientWithRGBAStopsParses() {
    let value = "linear-gradient(to right, rgba(255,0,0,0.8) 0%, rgba(0,0,255,0.3) 100%)"
    XCTAssertNotNil(JSGradientParser.parse(value))
  }

  func testLinearGradientWithSpaceSlashRGBAParses() {
    let value = "linear-gradient(90deg, rgba(255 0 0 / 80%) 0%, rgba(0 0 255 / 30%) 100%)"
    XCTAssertNotNil(JSGradientParser.parse(value))
  }

  func testRadialGradientWithRGBAAndTransparentParses() {
    let value = "radial-gradient(circle at center, rgba(255,0,0,.8) 10%, transparent 90%)"
    XCTAssertNotNil(JSGradientParser.parse(value))
  }

  func testConicGradientWithDegreeStopsParses() {
    let value = "conic-gradient(from 90deg at center, rgba(255,0,0,.8) 0deg, rgba(0,0,255,.3) 360deg)"
    XCTAssertNotNil(JSGradientParser.parse(value))
  }

  func testInvalidColorTokenWithTrailingGarbageFails() {
    let value = "linear-gradient(to right, rgba(255,0,0,0.8)garbage 0%, blue 100%)"
    XCTAssertNil(JSGradientParser.parse(value))
  }

  func testMalformedParenthesesFails() {
    let value = "linear-gradient(to right, rgba(255,0,0,0.8 0%, blue 100%)"
    XCTAssertNil(JSGradientParser.parse(value))
  }

  func testBadStopTokenFails() {
    let value = "linear-gradient(to right, red badstop, blue 100%)"
    XCTAssertNil(JSGradientParser.parse(value))
  }
}

final class JSColorParserTests: XCTestCase {
  func testRGBSlashSyntaxParses() {
    XCTAssertNotNil(JSColorParser.parse("rgb(255 0 0 / 80%)"))
    XCTAssertNotNil(JSColorParser.parse("rgba(255 0 0 / 0.8)"))
    XCTAssertNotNil(JSColorParser.parse("hsl(240 100% 50% / 30%)"))
  }

  func testTrailingGarbageRejected() {
    XCTAssertNil(JSColorParser.parse("rgba(255,0,0,0.8)garbage"))
    XCTAssertNil(JSColorParser.parse("rgb(255,0)"))
    XCTAssertNil(JSColorParser.parse("hsl(120, 100, 50%)"))
  }
}
