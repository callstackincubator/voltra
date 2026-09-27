import Foundation
@testable import VoltraSharedCore
@testable import VoltraStyleCore
import XCTest

/// Parity between `Voltra.modifiers` and the Swift registry. The fixture is written by the
/// `@use-voltra/ios` test suite (`UPDATE_MODIFIER_FIXTURES=1 pnpm --filter @use-voltra/ios test`).
final class NativeModifierTests: XCTestCase {
  private func fixtureJSON() throws -> String {
    let url = URL(fileURLWithPath: #filePath)
      .deletingLastPathComponent()
      .appendingPathComponent("Fixtures/native-modifiers.json")
    return try String(contentsOf: url, encoding: .utf8)
  }

  func testEveryTypeScriptModifierIsRegisteredAndDecodes() throws {
    let descriptors = try VoltraModifierRegistry.parseDescriptors(fixtureJSON())
    XCTAssertFalse(descriptors.isEmpty)

    for descriptor in descriptors {
      XCTAssertNoThrow(
        XCTAssertNotNil(try VoltraModifierRegistry.makeModifier(descriptor), "Unknown modifier \(descriptor.type)"),
        "Modifier \(descriptor.type) did not decode"
      )
    }
  }

  func testEveryRegisteredModifierHasATypeScriptFactory() throws {
    let fixtureTypes = try Set(VoltraModifierRegistry.parseDescriptors(fixtureJSON()).map(\.type))
    XCTAssertEqual(VoltraModifierRegistry.registeredTypes, fixtureTypes)
  }

  func testUnknownTypeReturnsNil() throws {
    let descriptor = VoltraModifierDescriptor(type: "doesNotExist", params: [:])
    XCTAssertNil(try VoltraModifierRegistry.makeModifier(descriptor))
  }

  func testInvalidParameterThrows() {
    let descriptor = VoltraModifierDescriptor(type: "clipShape", params: ["shape": "hexagon"])
    XCTAssertThrowsError(try VoltraModifierRegistry.makeModifier(descriptor)) { error in
      XCTAssertEqual(error as? VoltraModifierError, .invalidParameter("shape"))
    }
  }

  func testParseDescriptorsKeepsOrderAndDropsEntriesWithoutType() {
    let json = #"[{"$type":"clipShape","shape":"circle"},{"shape":"circle"},{"$type":"widgetURL","url":"a://b"}]"#
    let descriptors = VoltraModifierRegistry.parseDescriptors(json)
    XCTAssertEqual(descriptors.map(\.type), ["clipShape", "widgetURL"])
    XCTAssertEqual(descriptors[0].params["shape"] as? String, "circle")
    XCTAssertNil(descriptors[0].params["$type"])
  }

  func testParseDescriptorsIgnoresMalformedJSON() {
    XCTAssertTrue(VoltraModifierRegistry.parseDescriptors("not json").isEmpty)
    XCTAssertTrue(VoltraModifierRegistry.parseDescriptors(#"{"$type":"clipShape"}"#).isEmpty)
    XCTAssertTrue(VoltraModifierRegistry.parseDescriptors(nil).isEmpty)
  }

  func testUnexpectedParameterThrows() {
    // A parameter renamed on the TypeScript side must not fall back to a default silently.
    let descriptor = VoltraModifierDescriptor(type: "clipShape", params: ["shape": "circle", "radius": 4])
    XCTAssertThrowsError(try VoltraModifierRegistry.makeModifier(descriptor)) { error in
      XCTAssertEqual(error as? VoltraModifierError, .unexpectedParameter("radius"))
    }
  }

  func testOptionalStringRejectsWrongType() {
    let descriptor = VoltraModifierDescriptor(type: "clipShape", params: ["shape": "capsule", "cornerStyle": 1])
    XCTAssertThrowsError(try VoltraModifierRegistry.makeModifier(descriptor)) { error in
      XCTAssertEqual(error as? VoltraModifierError, .invalidParameter("cornerStyle"))
    }
  }

  func testNullColorMeansSystemDefault() throws {
    let json = #"[{"color":null,"$type":"activityBackgroundTint"}]"#
    let descriptor = try XCTUnwrap(VoltraModifierRegistry.parseDescriptors(json).first)
    let modifier = try XCTUnwrap(VoltraModifierRegistry.makeModifier(descriptor) as? ActivityBackgroundTintModifier)
    XCTAssertNil(modifier.color)
  }

  func testInvalidColorAndEnumValuesThrow() {
    let badColor = VoltraModifierDescriptor(type: "containerBackground", params: ["color": "not-a-color"])
    XCTAssertThrowsError(try VoltraModifierRegistry.makeModifier(badColor)) { error in
      XCTAssertEqual(error as? VoltraModifierError, .invalidParameter("color"))
    }
    let badEnum = VoltraModifierDescriptor(type: "symbolEffect", params: ["effect": "explode"])
    XCTAssertThrowsError(try VoltraModifierRegistry.makeModifier(badEnum)) { error in
      XCTAssertEqual(error as? VoltraModifierError, .invalidParameter("effect"))
    }
  }

  func testCanApplyOnlyForKnownDecodableModifiers() {
    XCTAssertTrue(VoltraModifierRegistry.canApply(
      VoltraModifierDescriptor(type: "containerBackground", params: ["color": "#101828"])
    ))
    // Hosts keep their default container background and widget URL for these.
    XCTAssertFalse(VoltraModifierRegistry.canApply(
      VoltraModifierDescriptor(type: "containerBackground", params: ["color": "not-a-color"])
    ))
    XCTAssertFalse(VoltraModifierRegistry.canApply(
      VoltraModifierDescriptor(type: "widgetURL", params: ["url": ""])
    ))
    XCTAssertFalse(VoltraModifierRegistry.canApply(VoltraModifierDescriptor(type: "doesNotExist", params: [:])))
  }

  func testAnimationRequiresAValue() {
    let descriptor = VoltraModifierDescriptor(type: "animation", params: ["curve": "linear"])
    XCTAssertThrowsError(try VoltraModifierRegistry.makeModifier(descriptor)) { error in
      XCTAssertEqual(error as? VoltraModifierError, .missingParameter("value"))
    }
  }

  func testBooleanParameterRejectsNumbers() {
    let descriptor = VoltraModifierDescriptor(type: "privacySensitive", params: ["sensitive": NSNumber(value: 1)])
    XCTAssertThrowsError(try VoltraModifierRegistry.makeModifier(descriptor))
  }

  // MARK: - Parsed tree

  private func parseNode(_ json: String) throws -> VoltraNode {
    try VoltraNode.parse(from: JSONValue.parse(from: json))
  }

  func testElementDecodesItsModifiersWhileParsing() throws {
    let node = try parseNode(##"{"t":11,"p":{"mods":"[{\"$type\":\"widgetURL\",\"url\":\"a://b\"}]"}}"##)
    guard case let .element(element) = node else { return XCTFail("Expected an element") }
    XCTAssertEqual(element.nativeModifiers.map(\.type), ["widgetURL"])
    XCTAssertEqual(element.nativeModifiers.first?.params["url"] as? String, "a://b")
  }

  func testContainsNativeModifierLooksThroughChildren() throws {
    let node = try parseNode(
      ##"{"t":11,"c":[{"t":0,"c":"Hi","p":{"mods":"[{\"$type\":\"widgetURL\",\"url\":\"a://b\"}]"}}]}"##
    )
    XCTAssertTrue(node.containsNativeModifier("widgetURL"))
    XCTAssertFalse(node.containsNativeModifier("containerBackground"))
  }

  func testContainsNativeModifierLooksThroughComponentProps() throws {
    // A Gauge label is stored in a prop and rendered through `componentProp`, not as a child.
    let node = try parseNode(
      ##"{"t":8,"p":{"currentValueLabel":{"t":0,"c":"42","p":{"mods":"[{\"$type\":\"containerBackground\",\"color\":\"#101828\"}]"}}}}"##
    )
    XCTAssertTrue(node.containsNativeModifier("containerBackground"))
  }

  func testContainsNativeModifierIgnoresDescriptorsThatDoNotDecode() throws {
    let node = try parseNode(##"{"t":11,"p":{"mods":"[{\"$type\":\"containerBackground\",\"color\":\"nope\"}]"}}"##)
    XCTAssertFalse(node.containsNativeModifier("containerBackground"))
  }
}
