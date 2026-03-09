import XCTest
import SwiftUI
@testable import VoltraStyleCore

final class JSGradientParserTests: XCTestCase {
  private func assertLinearGradient(
    _ value: String,
    file: StaticString = #filePath,
    line: UInt = #line,
    _ assertions: (_ stops: [Gradient.Stop], _ start: UnitPoint, _ end: UnitPoint) -> Void
  ) {
    let parsed = JSGradientParser.parse(value)
    guard case let .linearGradient(gradient, startPoint, endPoint)? = parsed else {
      XCTFail("Expected linear gradient for: \(value), got: \(String(describing: parsed))", file: file, line: line)
      return
    }
    assertions(gradient.stops, startPoint, endPoint)
  }

  private func assertRadialGradient(
    _ value: String,
    file: StaticString = #filePath,
    line: UInt = #line,
    _ assertions: (_ spec: RadialGradientSpec) -> Void
  ) {
    let parsed = JSGradientParser.parse(value)
    guard case let .radialGradient(spec)? = parsed else {
      XCTFail("Expected radial gradient for: \(value), got: \(String(describing: parsed))", file: file, line: line)
      return
    }
    assertions(spec)
  }

  private func assertConicGradient(
    _ value: String,
    file: StaticString = #filePath,
    line: UInt = #line,
    _ assertions: (_ stops: [Gradient.Stop], _ center: UnitPoint, _ angle: Angle) -> Void
  ) {
    guard case let .angularGradient(gradient, center, angle)? = JSGradientParser.parse(value) else {
      XCTFail("Expected conic gradient for: \(value)", file: file, line: line)
      return
    }
    assertions(gradient.stops, center, angle)
  }

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

  func testLinearGradientDirectionParsesExpectedStartAndEndPoints() {
    assertLinearGradient("linear-gradient(to bottom right, rgba(255,0,0,1) 0%, rgba(0,0,255,1) 100%)") { _, start, end in
      XCTAssertEqual(start.x, 0, accuracy: 0.0001)
      XCTAssertEqual(start.y, 0, accuracy: 0.0001)
      XCTAssertEqual(end.x, 1, accuracy: 0.0001)
      XCTAssertEqual(end.y, 1, accuracy: 0.0001)
    }
  }

  func testLinearGradientAngleParsesExpectedStartAndEndPoints() {
    assertLinearGradient("linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(0,0,255,1) 100%)") { _, start, end in
      XCTAssertEqual(start.x, 0, accuracy: 0.0001)
      XCTAssertEqual(start.y, 0.5, accuracy: 0.0001)
      XCTAssertEqual(end.x, 1, accuracy: 0.0001)
      XCTAssertEqual(end.y, 0.5, accuracy: 0.0001)
    }
  }

  func testDoublePositionStopExpandsIntoTwoStops() {
    assertLinearGradient("linear-gradient(to right, red 10% 30%, blue 100%)") { stops, _, _ in
      XCTAssertEqual(stops.count, 3)
      XCTAssertEqual(stops[0].location, 0.1, accuracy: 0.0001)
      XCTAssertEqual(stops[1].location, 0.3, accuracy: 0.0001)
      XCTAssertEqual(stops[2].location, 1, accuracy: 0.0001)
    }
  }

  func testStopPositionsClampToNonDecreasingOrder() {
    assertLinearGradient("linear-gradient(to right, red 70%, green 30%, blue 100%)") { stops, _, _ in
      XCTAssertEqual(stops.count, 3)
      XCTAssertEqual(stops[0].location, 0.7, accuracy: 0.0001)
      XCTAssertEqual(stops[1].location, 0.7, accuracy: 0.0001)
      XCTAssertEqual(stops[2].location, 1, accuracy: 0.0001)
    }
  }

  func testRadialGradientPreludeParsesShapeExtentAndCenter() {
    assertRadialGradient("radial-gradient(circle closest-side at top right, red 0%, blue 100%)") { spec in
      guard case .circle = spec.shape else {
        XCTFail("Expected circle radial shape")
        return
      }
      guard case .closestSide = spec.extent else {
        XCTFail("Expected closest-side radial extent")
        return
      }
      XCTAssertEqual(spec.center.x, 1, accuracy: 0.0001)
      XCTAssertEqual(spec.center.y, 0, accuracy: 0.0001)
      XCTAssertEqual(spec.gradient.stops.count, 2)
    }
  }

  func testConicGradientPreludeParsesAngleAndCenter() {
    assertConicGradient("conic-gradient(from 0.25turn at left bottom, red 0%, blue 100%)") { stops, center, angle in
      XCTAssertEqual(stops.count, 2)
      XCTAssertEqual(center.x, 0, accuracy: 0.0001)
      XCTAssertEqual(center.y, 1, accuracy: 0.0001)
      XCTAssertEqual(angle.degrees, 90, accuracy: 0.0001)
    }
  }

  func testConicGradientDegreeStopsMapToUnitInterval() {
    assertConicGradient("conic-gradient(from 0deg at center, red 90deg, blue 270deg)") { stops, _, _ in
      XCTAssertEqual(stops.count, 2)
      XCTAssertEqual(stops[0].location, 0.25, accuracy: 0.0001)
      XCTAssertEqual(stops[1].location, 0.75, accuracy: 0.0001)
    }
  }

  func testRepeatingGradientsAreRejected() {
    XCTAssertNil(JSGradientParser.parse("repeating-linear-gradient(to right, red, blue)"))
    XCTAssertNil(JSGradientParser.parse("repeating-radial-gradient(circle, red, blue)"))
    XCTAssertNil(JSGradientParser.parse("repeating-conic-gradient(from 45deg, red, blue)"))
  }

  func testInvalidRadialPreludeFails() {
    XCTAssertNil(JSGradientParser.parse("radial-gradient(circle foo at center, red, blue)"))
  }

  func testConicStopsWithPercentAndAngleProduceExpandedStops() {
    assertConicGradient("conic-gradient(from 0deg at center, red 25% 90deg, blue 100%)") { stops, _, _ in
      XCTAssertEqual(stops.count, 3)
      XCTAssertEqual(stops[0].location, 0.25, accuracy: 0.0001)
      XCTAssertEqual(stops[1].location, 0.25, accuracy: 0.0001)
      XCTAssertEqual(stops[2].location, 1, accuracy: 0.0001)
    }
  }
}

final class JSColorParserTests: XCTestCase {
  func testNamedColorsParse() {
    XCTAssertNotNil(JSColorParser.parse("red"))
    XCTAssertNotNil(JSColorParser.parse("green"))
    XCTAssertNotNil(JSColorParser.parse("blue"))
  }

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
