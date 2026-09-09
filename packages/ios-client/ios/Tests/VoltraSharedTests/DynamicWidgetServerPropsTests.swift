@testable import VoltraSharedCore
import XCTest

final class DynamicWidgetServerPropsTests: XCTestCase {
  private func parse(_ body: String) -> DynamicWidgetPropsParseResult {
    DynamicWidgetServerProps.parse(Data(body.utf8))
  }

  private func invalidReason(_ body: String) -> String {
    guard case let .invalid(reason) = parse(body) else {
      XCTFail("expected \(body) to be rejected")
      return ""
    }

    return reason
  }

  func testAcceptsAJsonObjectAndHandsItThrough() {
    guard case let .props(json) = parse(#"{"total":42}"#) else {
      return XCTFail("expected props")
    }

    XCTAssertEqual(json, #"{"total":42}"#)
  }

  func testAcceptsAnEmptyObjectWhichIsWhatAWidgetAlreadyGetsBeforeItsFirstProps() {
    guard case .props = parse("{}") else {
      return XCTFail("expected props")
    }
  }

  func testRejectsATopLevelArrayPrimitiveOrNull() {
    XCTAssertTrue(invalidReason("[1,2,3]").contains("JSON object"))
    XCTAssertTrue(invalidReason("42").contains("JSON object"))
    XCTAssertTrue(invalidReason("\"hello\"").contains("JSON object"))
    XCTAssertTrue(invalidReason("null").contains("JSON object"))
  }

  func testRejectsABodyThatIsNotJsonAtAll() {
    XCTAssertTrue(invalidReason("<html>nope</html>").contains("not JSON"))
    XCTAssertTrue(invalidReason("").contains("empty"))
  }

  func testRejectsAVoltraPayloadByNameBecauseThatIsTheMistakeSharingTheConfigKeyInvites() {
    let reason = invalidReason(#"{"v":1,"variants":{"systemSmall":{"t":1}}}"#)

    XCTAssertTrue(reason.contains("Voltra payload"))
    XCTAssertTrue(reason.contains("entry"))
  }

  func testRejectsAPayloadThatCarriesSharedElementsInsteadOfVariants() {
    XCTAssertTrue(invalidReason(#"{"v":1,"e":[{"t":1}]}"#).contains("Voltra payload"))
  }

  func testDoesNotMistakePropsThatHappenToHaveAVKeyForAPayload() {
    guard case .props = parse(#"{"v":1,"label":"hi"}"#) else {
      return XCTFail("expected props")
    }

    guard case .props = parse(#"{"v":"1.2.3","variants":{"a":1}}"#) else {
      return XCTFail("expected props")
    }
  }
}
