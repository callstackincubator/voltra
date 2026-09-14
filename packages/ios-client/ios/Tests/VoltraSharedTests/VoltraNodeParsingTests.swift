import Foundation
@testable import VoltraSharedCore
import XCTest

/// Characterises how a compact payload is turned into the `VoltraNode` / `VoltraElement` AST:
/// component ids, short prop names, stylesheet indices and shared element references.
final class VoltraNodeParsingTests: XCTestCase {
  // MARK: - Helpers

  private func parse(_ json: String) throws -> VoltraNode {
    let value = try JSONValue.parse(from: json)
    return VoltraNode.parse(from: value)
  }

  private func rootElement(_ json: String) throws -> VoltraElement {
    try asElement(parse(json))
  }

  private func asElement(_ node: VoltraNode) throws -> VoltraElement {
    guard case let .element(element) = node else {
      throw TestFailure("Expected an element, got \(node)")
    }
    return element
  }

  private func arrayChildren(_ element: VoltraElement) throws -> [VoltraNode] {
    guard case let .array(nodes)? = element.children else {
      throw TestFailure("Expected array children, got \(String(describing: element.children))")
    }
    return nodes
  }

  // MARK: - Structure

  func testParsesComponentTypeIdAndIdentifier() throws {
    let text = try rootElement(##"{"t":0,"i":"headline","c":"Hello"}"##)

    XCTAssertEqual(text.type, "Text")
    XCTAssertEqual(text.id, "headline")
    XCTAssertEqual(text.children, .text("Hello"))
  }

  func testReturnsEmptyNodeForUnknownComponentTypeId() throws {
    XCTAssertEqual(try parse(##"{"t":9999}"##), .empty)
  }

  func testExpandsShortPropNamesToFullNames() throws {
    let text = try rootElement(##"{"t":0,"p":{"mt":12}}"##)

    XCTAssertEqual(text.props?["marginTop"]?.intValue, 12)
  }

  // MARK: - Stylesheet resolution

  func testResolvesStylesheetIndexIntoExpandedStyle() throws {
    let text = try rootElement(##"{"t":0,"c":"42","p":{"s":1},"s":[{"fs":14},{"fs":32,"c":"#ff6d39"}]}"##)

    XCTAssertEqual(text.style?["fontSize"]?.intValue, 32)
    XCTAssertEqual(text.style?["color"]?.stringValue, "#ff6d39")
  }

  func testResolvesInlineStyleObject() throws {
    let text = try rootElement(##"{"t":0,"c":"42","p":{"s":{"fs":32}}}"##)

    XCTAssertEqual(text.style?["fontSize"]?.intValue, 32)
  }

  func testReturnsNilStyleForOutOfRangeStylesheetIndex() throws {
    let text = try rootElement(##"{"t":0,"c":"42","p":{"s":7},"s":[{"fs":14}]}"##)

    XCTAssertNil(text.style)
  }

  func testResolvesStylesheetIndicesForNestedChildren() throws {
    let stack = try rootElement(##"""
    {"t":11,"c":[{"t":0,"c":"42","p":{"s":0}},{"t":0,"c":"label","p":{"s":1}}],"p":{"s":2},"s":[{"fs":32,"c":"#ff6d39"},{"fs":14},{"fl":1}]}
    """##)

    let children = try arrayChildren(stack)
    XCTAssertEqual(stack.style?["flex"]?.intValue, 1)
    XCTAssertEqual(try asElement(children[0]).style?["color"]?.stringValue, "#ff6d39")
    XCTAssertEqual(try asElement(children[1]).style?["fontSize"]?.intValue, 14)
  }

  // MARK: - Shared element resolution

  func testResolvesSharedElementReferenceInChildren() throws {
    let stack = try rootElement(##"{"t":11,"c":[{"$r":0},{"$r":0}],"e":[{"t":0,"c":"Uptime"}]}"##)

    let children = try arrayChildren(stack)
    XCTAssertEqual(children.count, 2)
    for child in children {
      XCTAssertEqual(try asElement(child).children, .text("Uptime"))
    }
  }

  func testResolvesStylesheetIndexInsideSharedElement() throws {
    let stack = try rootElement(##"""
    {"t":11,"c":[{"$r":0}],"e":[{"t":0,"c":"Uptime","p":{"s":0}}],"s":[{"fs":10,"c":"#ff6d39"}]}
    """##)

    let shared = try asElement(arrayChildren(stack)[0])
    XCTAssertEqual(shared.style?["color"]?.stringValue, "#ff6d39")
  }

  // MARK: - Component props

  func testResolvesElementValuedPropIntoNode() throws {
    let gauge = try rootElement(##"""
    {"t":8,"p":{"v":0.5,"lbl":{"t":0,"c":"Uptime","p":{"s":0}}},"s":[{"fs":10,"c":"#ff6d39"}]}
    """##)

    let label = try asElement(gauge.componentProp("label"))
    XCTAssertEqual(label.children, .text("Uptime"))
    XCTAssertEqual(label.style?["color"]?.stringValue, "#ff6d39")
  }

  func testTreatsScalarPropAsTextNode() throws {
    let gauge = try rootElement(##"{"t":8,"p":{"lbl":"Uptime"}}"##)

    XCTAssertEqual(gauge.componentProp("label"), .text("Uptime"))
  }

  func testReturnsEmptyNodeForAbsentComponentProp() throws {
    let gauge = try rootElement(##"{"t":8,"p":{"v":0.5}}"##)

    XCTAssertEqual(gauge.componentProp("label"), .empty)
  }
}

/// Lets the parsing helpers bail out of a test with a readable message.
struct TestFailure: Error, CustomStringConvertible {
  let description: String

  init(_ description: String) {
    self.description = description
  }
}
