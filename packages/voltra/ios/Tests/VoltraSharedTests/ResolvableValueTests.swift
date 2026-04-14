@testable import VoltraSharedCore
import XCTest

final class ResolvableValueTests: XCTestCase {
  func testParserParsesWhenExpressionIntoTypedTree() throws {
    let value = wrapped([
      .int(1),
      .array([
        .int(0),
        wrapped([
          .int(0),
          .int(0),
        ]),
        .string("accented"),
      ]),
      .object([
        "color": .string("red"),
        "visible": wrapped([
          .int(0),
          .int(1),
        ]),
      ]),
      .object([
        "color": .string("blue"),
      ]),
    ])

    let parsed = try ResolvableValueParser.parse(value)

    XCTAssertEqual(
      parsed,
      .expression(.when(
        condition: .eq(
          .expression(.env(.renderingMode)),
          .literal(.string("accented"))
        ),
        thenValue: .object([
          "color": .literal(.string("red")),
          "visible": .expression(.env(.showsWidgetContainerBackground)),
        ]),
        elseValue: .object([
          "color": .literal(.string("blue")),
        ])
      ))
    )
  }

  func testEvaluatorResolvesNestedObjectsAndArrays() {
    let value = JSONValue.object([
      "background": wrapped([
        .int(1),
        .array([
          .int(0),
          wrapped([
            .int(0),
            .int(0),
          ]),
          .string("accented"),
        ]),
        .string("clear"),
        .string("solid"),
      ]),
      "layers": .array([
        .string("base"),
        wrapped([
          .int(1),
          .array([
            .int(0),
            wrapped([
              .int(0),
              .int(1),
            ]),
            .bool(true),
          ]),
          .string("widget"),
          .string("app"),
        ]),
      ]),
    ])

    let resolved = ResolvableValueEvaluator.resolve(
      value,
      environment: .init(renderingMode: "accented", showsWidgetContainerBackground: true)
    )

    XCTAssertEqual(
      resolved,
      .object([
        "background": .string("clear"),
        "layers": .array([
          .string("base"),
          .string("widget"),
        ]),
      ])
    )
  }

  func testEvaluatorUsesDefaultMatchBranchWhenEnvIsUnavailable() {
    let value = wrapped([
      .int(2),
      wrapped([
        .int(0),
        .int(0),
      ]),
      .object([
        "accented": .string("accented-value"),
        "default": .string("fallback-value"),
      ]),
    ])

    let resolved = ResolvableValueEvaluator.resolve(value, environment: .init())

    XCTAssertEqual(resolved, .string("fallback-value"))
  }

  func testEvaluatorReturnsNullForInvalidWrappedPayload() {
    let invalidWrappedValue = JSONValue.object([
      "$rv": .string("not-a-tuple"),
    ])

    let resolved = ResolvableValueEvaluator.resolve(invalidWrappedValue, environment: .init())

    XCTAssertEqual(resolved, .null)
  }

  func testParserRejectsMatchWithoutDefaultCase() {
    let value = wrapped([
      .int(2),
      .string("accented"),
      .object([
        "accented": .string("yes"),
      ]),
    ])

    XCTAssertThrowsError(try ResolvableValueParser.parse(value)) { error in
      guard case ResolvableError.missingDefaultCase = error else {
        return XCTFail("Expected missingDefaultCase, got \(error)")
      }
    }
  }

  private func wrapped(_ tuple: [JSONValue]) -> JSONValue {
    .object([
      "$rv": .array(tuple),
    ])
  }
}
