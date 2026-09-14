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
    let orange = try rootElement(#"""
    {"t":11,"c":[{"t":0,"c":"42","p":{"s":0}},{"t":0,"c":"same","p":{"s":1}}],"p":{"s":2},"s":[{"fs":32,"c":"#ff6d39"},{"fs":14},{"fl":1}]}
    """#)
    let grey = try rootElement(#"""
    {"t":11,"c":[{"t":0,"c":"42","p":{"s":0}},{"t":0,"c":"same","p":{"s":1}}],"p":{"s":2},"s":[{"fs":32,"c":"#282830"},{"fs":14},{"fl":1}]}
    """#)

    // The counter serializes to the same node in both payloads; only the stylesheet differs.
    XCTAssertEqual(try child(orange, 0).style?["color"]?.stringValue, "#ff6d39")
    XCTAssertEqual(try child(grey, 0).style?["color"]?.stringValue, "#282830")
    XCTAssertNotEqual(try child(orange, 0), try child(grey, 0))
    XCTAssertNotEqual(orange, grey)
  }

  // MARK: - Deduplicated style inside an element-valued prop

  func testElementsDifferWhenAStylesheetEntryBehindAPropChanges() throws {
    let orange = try rootElement(#"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"t":0,"c":"Uptime","p":{"s":0}}}}],"p":{"s":1},"s":[{"fs":10,"c":"#ff6d39"},{"fl":1}]}
    """#)
    let grey = try rootElement(#"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"t":0,"c":"Uptime","p":{"s":0}}}}],"p":{"s":1},"s":[{"fs":10,"c":"#282830"},{"fl":1}]}
    """#)

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
    let first = try rootElement(#"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"$r":0}}},{"t":8,"p":{"v":0.5,"cvl":{"$r":0}}}],"e":[{"t":0,"c":"A"}]}
    """#)
    let second = try rootElement(#"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"$r":0}}},{"t":8,"p":{"v":0.5,"cvl":{"$r":0}}}],"e":[{"t":0,"c":"B"}]}
    """#)

    XCTAssertEqual(try child(first, 0).componentProp("label"), .element(try rootElement(#"{"t":0,"c":"A"}"#)))
    XCTAssertNotEqual(try child(first, 0), try child(second, 0))
    XCTAssertNotEqual(first, second)
  }

  // MARK: - Equality stays as coarse as it was

  func testIdenticalPayloadsStayEqualAndHashAlike() throws {
    let payload = #"""
    {"t":11,"c":[{"t":8,"p":{"v":0.5,"lbl":{"$r":0}}},{"t":0,"c":"42","p":{"s":0}}],"p":{"s":1},"e":[{"t":0,"c":"Uptime","p":{"s":0}}],"s":[{"fs":32,"c":"#ff6d39"},{"fl":1}]}
    """#

    let left = try rootElement(payload)
    let right = try rootElement(payload)

    XCTAssertEqual(left, right)
    XCTAssertEqual(left.hashValue, right.hashValue)
  }

  func testElementsStayEqualWhenAnUnreferencedStylesheetEntryChanges() throws {
    let left = try rootElement(#"{"t":0,"c":"42","p":{"s":0},"s":[{"fs":32},{"fs":14}]}"#)
    let right = try rootElement(#"{"t":0,"c":"42","p":{"s":0},"s":[{"fs":32},{"fs":99}]}"#)

    XCTAssertEqual(left, right)
  }

  // MARK: - Malformed payloads

  func testSelfReferentialSharedElementTerminates() throws {
    // `e[0]` names itself, so resolution has to stop on its own rather than recurse forever.
    let element = try rootElement(#"{"t":8,"p":{"lbl":{"$r":0}},"e":[{"$r":0}]}"#)

    XCTAssertEqual(element.type, "Gauge")
  }
}
