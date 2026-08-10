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

  func testUpdateAcceptsExactly4096EncodedBytesAndRejects4097() throws {
    let exact = try propsWithEncodedContentStateSize(4096, character: "x")
    let oversized = try propsWithEncodedContentStateSize(4097, character: "x")

    XCTAssertEqual(try VoltraDynamicLiveActivityPayloadValidator.encodedContentStateSize(exact), 4096)
    XCTAssertNoThrow(try VoltraDynamicLiveActivityPayloadValidator.validateContentState(exact))
    XCTAssertThrowsError(try VoltraDynamicLiveActivityPayloadValidator.validateContentState(oversized))
  }

  func testCountsUnicodeByEncodedBytesRatherThanCharacters() throws {
    let value = String(repeating: "🛵", count: 1020)
    let props: [String: VoltraDynamicLiveActivityJSONValue] = ["value": .string(value)]

    XCTAssertLessThan(value.count, 4096)
    XCTAssertGreaterThan(try VoltraDynamicLiveActivityPayloadValidator.encodedContentStateSize(props), 4096)
    XCTAssertThrowsError(try VoltraDynamicLiveActivityPayloadValidator.validateContentState(props))
  }

  func testStartUsesCombinedAttributesAndContentStateBudget() throws {
    let props = try propsWithEncodedContentStateSize(4000, character: "x")
    let size = try VoltraDynamicLiveActivityPayloadValidator.encodedStartSize(
      name: String(repeating: "n", count: 100),
      deepLinkUrl: nil,
      props: props
    )

    XCTAssertGreaterThan(size, 4096)
    XCTAssertThrowsError(
      try VoltraDynamicLiveActivityPayloadValidator.validate(
        name: String(repeating: "n", count: 100),
        deepLinkUrl: nil,
        props: props
      )
    )
  }

  func testUpdateDoesNotIncludeStaticAttributesInItsBudget() throws {
    let props = try propsWithEncodedContentStateSize(4096, character: "x")

    XCTAssertNoThrow(try VoltraDynamicLiveActivityPayloadValidator.validateContentState(props))
  }

  private func propsWithEncodedContentStateSize(
    _ target: Int,
    character: Character
  ) throws -> [String: VoltraDynamicLiveActivityJSONValue] {
    var value = ""
    while true {
      let props: [String: VoltraDynamicLiveActivityJSONValue] = ["value": .string(value)]
      let size = try VoltraDynamicLiveActivityPayloadValidator.encodedContentStateSize(props)
      if size == target {
        return props
      }
      if size > target {
        XCTFail("Could not construct an encoded payload of exactly \(target) bytes")
        return props
      }
      value.append(character)
    }
  }
}
