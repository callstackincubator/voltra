@testable import VoltraSharedCore
import XCTest

final class DynamicLiveActivityPayloadValidatorTests: XCTestCase {
  func testDecodesCompleteJSONCompatibleProps() throws {
    let props = try VoltraDynamicLiveActivityPayloadValidator.decodeProps(
      #"{"status":"delivering","items":[1,true,null],"address":{"city":"Warsaw"}}"#
    )

    XCTAssertEqual(props["status"], .string("delivering"))
    XCTAssertEqual(props["items"], .array([.number(1), .bool(true), .null]))
    XCTAssertEqual(props["address"], .object(["city": .string("Warsaw")]))
  }

  func testRejectsPropsBeyondActivityKitFourKilobyteLimit() throws {
    let props: [String: VoltraDynamicLiveActivityJSONValue] = ["message": .string(String(repeating: "x", count: 5000))]

    XCTAssertThrowsError(
      try VoltraDynamicLiveActivityPayloadValidator.validate(name: "order-123", deepLinkUrl: nil, props: props)
    ) { error in
      guard case VoltraDynamicLiveActivityError.payloadTooLarge = error else {
        return XCTFail("Expected payloadTooLarge, got \(error)")
      }
    }
  }
}
