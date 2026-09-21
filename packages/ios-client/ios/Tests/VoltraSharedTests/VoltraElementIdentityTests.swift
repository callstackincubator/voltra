import Foundation
@testable import VoltraSharedCore
import XCTest

/// Two payloads can serialize their element trees identically and still render differently, because
/// a style index or a `$r` reference points at a per-payload table that changed underneath it. An
/// element that compared equal in that situation let SwiftUI keep the previous render.
final class VoltraElementIdentityTests: XCTestCase {
  // MARK: - Helpers

  private func rootElement(_ json: String) throws -> VoltraElement {
    let value = try JSONValue.parse(from: json)
    guard case let .element(element) = VoltraNode.parse(from: value) else {
      throw TestFailure("Expected the payload root to parse into an element")
    }
    return element
  }

  private func child(_ element: VoltraElement, _ index: Int) throws -> VoltraElement {
    guard case let .array(nodes)? = element.children, nodes.indices.contains(index),
          case let .element(child) = nodes[index]
    else {
      throw TestFailure("Expected an element child at index \(index)")
    }
    return child
  }

  // MARK: - Deduplicated style on the element itself

  func testElementsDifferWhenOnlyTheirOwnStylesheetEntryChanges() throws {
    let orange = try rootElement(##"""
    {"t":11,"c":[{"t":0,"c":"42","p":{"s":0}},{"t":0,"c":"same","p":{"s":1}}],"p":{"s":2},"s":[{"fs":32,"c":"#ff6d39"},{"fs":14},{"fl":1}]}
    """##)
    let grey = try rootElement(##"""
    {"t":11,"c":[{"t":0,"c":"42","p":{"s":0}},{"t":0,"c":"same","p":{"s":1}}],"p":{"s":2},"s":[{"fs":32,"c":"#282830"},{"fs":14},{"fl":1}]}
    """##)

    // The counter serializes to the same node in both payloads; only the stylesheet differs.
    XCTAssertEqual(try child(orange, 0).style?["color"]?.stringValue, "#ff6d39")
    XCTAssertEqual(try child(grey, 0).style?["color"]?.stringValue, "#282830")
    XCTAssertNotEqual(try child(orange, 0), try child(grey, 0))
    XCTAssertNotEqual(orange, grey)
  }

  // MARK: - Deduplicated style inside an element-valued prop

  func testElementsDifferWhenAStylesheetEntryBehindAPropChanges() throws {
    let orange = try rootElement(##"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"t":0,"c":"Uptime","p":{"s":0}}}}],"p":{"s":1},"s":[{"fs":10,"c":"#ff6d39"},{"fl":1}]}
    """##)
    let grey = try rootElement(##"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"t":0,"c":"Uptime","p":{"s":0}}}}],"p":{"s":1},"s":[{"fs":10,"c":"#282830"},{"fl":1}]}
    """##)

    // The gauge has no children and no style of its own - the difference is entirely inside `label`.
    let orangeGauge = try child(orange, 0)
    let greyGauge = try child(grey, 0)
    guard case let .element(orangeLabel) = orangeGauge.componentProp("label"),
          case let .element(greyLabel) = greyGauge.componentProp("label")
    else {
      throw TestFailure("Expected the label prop to resolve into an element")
    }

    XCTAssertEqual(orangeLabel.style?["color"]?.stringValue, "#ff6d39")
    XCTAssertEqual(greyLabel.style?["color"]?.stringValue, "#282830")
    XCTAssertNil(orangeGauge.style)
    XCTAssertNil(orangeGauge.children)
    XCTAssertNotEqual(orangeGauge, greyGauge)
  }

  // MARK: - Shared element behind a prop

  func testElementsDifferWhenASharedElementBehindAPropChanges() throws {
    let first = try rootElement(##"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"$r":0}}},{"t":8,"p":{"v":0.5,"cvl":{"$r":0}}}],"e":[{"t":0,"c":"A"}]}
    """##)
    let second = try rootElement(##"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"$r":0}}},{"t":8,"p":{"v":0.5,"cvl":{"$r":0}}}],"e":[{"t":0,"c":"B"}]}
    """##)

    let resolvedLabel = try rootElement(##"{"t":0,"c":"A"}"##)
    XCTAssertEqual(try child(first, 0).componentProp("label"), .element(resolvedLabel))
    XCTAssertNotEqual(try child(first, 0), try child(second, 0))
    XCTAssertNotEqual(first, second)
  }

  // MARK: - Equality stays as coarse as it was

  func testIdenticalPayloadsStayEqualAndHashAlike() throws {
    let payload = ##"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"$r":0}}},{"t":0,"c":"42","p":{"s":0}}],"p":{"s":1},"e":[{"t":0,"c":"Uptime","p":{"s":0}}],"s":[{"fs":32,"c":"#ff6d39"},{"fl":1}]}
    """##

    let left = try rootElement(payload)
    let right = try rootElement(payload)

    XCTAssertEqual(left, right)
    XCTAssertEqual(left.hashValue, right.hashValue)
  }

  func testElementsStayEqualWhenAnUnreferencedStylesheetEntryChanges() throws {
    let left = try rootElement(##"{"t":0,"c":"42","p":{"s":0},"s":[{"fs":32},{"fs":14}]}"##)
    let right = try rootElement(##"{"t":0,"c":"42","p":{"s":0},"s":[{"fs":32},{"fs":99}]}"##)

    XCTAssertEqual(left, right)
  }

  // MARK: - Deeply nested component props

  private func nestedStacks(around leaf: String, depth: Int) -> String {
    var node = leaf
    for _ in 0 ..< depth {
      node = #"{"t":11,"c":[\#(node)]}"#
    }
    return node
  }

  private func captionLeaf(_ gauge: VoltraElement, depth: Int) throws -> VoltraElement {
    guard case let .element(caption) = gauge.componentProp("currentValueLabel") else {
      throw TestFailure("Expected the caption to resolve into an element")
    }
    var leaf = caption
    for _ in 0 ..< depth {
      leaf = try child(leaf, 0)
    }
    return leaf
  }

  func testDeeplyNestedPropStylesRemainResolvedAndAffectIdentity() throws {
    // Object and array traversal used to exhaust the resolution limit after 31 stacks.
    for depth in [31, 64] {
      let caption = nestedStacks(around: #"{"t":0,"c":"42","p":{"s":0}}"#, depth: depth)
      let orange = try rootElement(##"{"t":8,"p":{"cvl":\##(caption)},"s":[{"c":"#ff6d39"}]}"##)
      let grey = try rootElement(##"{"t":8,"p":{"cvl":\##(caption)},"s":[{"c":"#282830"}]}"##)
      let orangeText = try captionLeaf(orange, depth: depth)
      let greyText = try captionLeaf(grey, depth: depth)

      XCTAssertEqual(orangeText.children, .text("42"))
      XCTAssertEqual(orangeText.style?["color"]?.stringValue, "#ff6d39")
      XCTAssertEqual(greyText.style?["color"]?.stringValue, "#282830")
      XCTAssertNotEqual(orangeText, greyText)
      XCTAssertNotEqual(orange, grey)
    }
  }

  func testDeeplyNestedSharedPropElementsRemainVisibleAndStyled() throws {
    for depth in [31, 64] {
      let caption = nestedStacks(around: #"{"$r":0}"#, depth: depth)
      let gauge = try rootElement(##"{"t":8,"p":{"cvl":\##(caption)},"e":[{"t":0,"c":"42","p":{"s":0}}],"s":[{"c":"#ff6d39"}]}"##)
      let text = try captionLeaf(gauge, depth: depth)

      XCTAssertEqual(text.type, "Text")
      XCTAssertEqual(text.children, .text("42"))
      XCTAssertEqual(text.style?["color"]?.stringValue, "#ff6d39")
    }
  }
}
