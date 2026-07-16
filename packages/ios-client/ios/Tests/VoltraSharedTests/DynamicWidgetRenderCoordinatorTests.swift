import Foundation
@testable import VoltraSharedCore
import XCTest

final class DynamicWidgetRenderCoordinatorTests: XCTestCase {
  func testForwardsPersistedNestedPropsIDAndEnvironmentToDynamicWidgetRuntimeBoundaryUnchanged() throws {
    let storage = InMemoryDynamicWidgetRenderPropsStorage()
    let store = DynamicWidgetPropsStore(storage: storage)
    let dynamicWidgetID = "weather-dynamic-widget"
    let persistedPropsJSON = #"{"location":{"city":"Kraków","coordinates":{"latitude":50.06,"longitude":19.94}},"units":["celsius","metric"]}"#
    let dynamicWidgetEnvironmentJSON = #"{"widgetFamily":"systemMedium","locale":"pl_PL","configuration":{"station":"central"}}"#
    let runtimeOutput = #"{"type":"text","props":{"content":"21°C"}}"#
    let propsProvider = RecordingDynamicWidgetPropsProvider(provider: store.dynamicWidgetProps(for:))
    let runtimeBoundary = RecordingDynamicWidgetRuntimeBoundary(output: runtimeOutput)
    let coordinator = DynamicWidgetRenderCoordinator(
      dynamicWidgetPropsProvider: propsProvider.dynamicWidgetProps,
      dynamicWidgetRuntimeBoundary: runtimeBoundary.render
    )

    try store.persistDynamicWidgetProps(persistedPropsJSON, for: dynamicWidgetID)

    let output = coordinator.renderDynamicWidget(
      dynamicWidgetID: dynamicWidgetID,
      dynamicWidgetEnvironmentJSON: dynamicWidgetEnvironmentJSON
    )

    let invocation = try XCTUnwrap(runtimeBoundary.invocations.first)
    XCTAssertEqual(output, runtimeOutput)
    XCTAssertEqual(invocation.dynamicWidgetID, dynamicWidgetID)
    XCTAssertEqual(invocation.dynamicWidgetPropsJSON, propsProvider.providedPropsJSON.first)
    XCTAssertEqual(
      try JSONValue.parse(from: invocation.dynamicWidgetPropsJSON),
      try JSONValue.parse(from: persistedPropsJSON)
    )
    XCTAssertEqual(invocation.dynamicWidgetEnvironmentJSON, dynamicWidgetEnvironmentJSON)
  }

  func testForwardsCanonicalEmptyPropsWhenPersistedPropsAreUnavailableOrUnsupported() throws {
    let absentStorage = InMemoryDynamicWidgetRenderPropsStorage()
    let corruptStorage = InMemoryDynamicWidgetRenderPropsStorage()
    let unsupportedStorage = InMemoryDynamicWidgetRenderPropsStorage()
    let dynamicWidgetEnvironmentJSON = #"{"widgetFamily":"systemSmall"}"#
    let runtimeOutput = #"{"type":"empty"}"#

    corruptStorage.values[
      DynamicWidgetPropsStore.storageKey(for: "corrupt-dynamic-widget")
    ] = "not json"
    unsupportedStorage.values[
      DynamicWidgetPropsStore.storageKey(for: "unsupported-dynamic-widget")
    ] = #"{"dynamicWidgetPropsStorageVersion":99,"dynamicWidgetProps":{"future":true}}"#

    let cases = [
      (dynamicWidgetID: "absent-dynamic-widget", storage: absentStorage),
      (dynamicWidgetID: "corrupt-dynamic-widget", storage: corruptStorage),
      (dynamicWidgetID: "unsupported-dynamic-widget", storage: unsupportedStorage),
    ]

    for testCase in cases {
      let store = DynamicWidgetPropsStore(storage: testCase.storage)
      let runtimeBoundary = RecordingDynamicWidgetRuntimeBoundary(output: runtimeOutput)
      let coordinator = DynamicWidgetRenderCoordinator(
        dynamicWidgetPropsProvider: store.dynamicWidgetProps(for:),
        dynamicWidgetRuntimeBoundary: runtimeBoundary.render
      )

      let output = coordinator.renderDynamicWidget(
        dynamicWidgetID: testCase.dynamicWidgetID,
        dynamicWidgetEnvironmentJSON: dynamicWidgetEnvironmentJSON
      )

      let invocation = try XCTUnwrap(runtimeBoundary.invocations.first)
      XCTAssertEqual(output, runtimeOutput)
      XCTAssertEqual(invocation.dynamicWidgetPropsJSON, "{}")
    }
  }

  func testKeepsNilDynamicWidgetRuntimeOutputNilForCallerFallback() {
    let runtimeBoundary = RecordingDynamicWidgetRuntimeBoundary(output: nil)
    let coordinator = DynamicWidgetRenderCoordinator(
      dynamicWidgetPropsProvider: { _ in #"{"status":"current"}"# },
      dynamicWidgetRuntimeBoundary: runtimeBoundary.render
    )

    let output = coordinator.renderDynamicWidget(
      dynamicWidgetID: "fallback-dynamic-widget",
      dynamicWidgetEnvironmentJSON: #"{"widgetFamily":"systemLarge"}"#
    )

    XCTAssertNil(output)
    XCTAssertEqual(runtimeBoundary.invocations.count, 1)
  }
}

private final class RecordingDynamicWidgetPropsProvider {
  private let provider: DynamicWidgetRenderCoordinator.DynamicWidgetPropsProvider
  private(set) var providedPropsJSON: [String] = []

  init(provider: @escaping DynamicWidgetRenderCoordinator.DynamicWidgetPropsProvider) {
    self.provider = provider
  }

  func dynamicWidgetProps(for dynamicWidgetID: String) -> String {
    let dynamicWidgetPropsJSON = provider(dynamicWidgetID)
    providedPropsJSON.append(dynamicWidgetPropsJSON)
    return dynamicWidgetPropsJSON
  }
}

private struct DynamicWidgetRuntimeInvocation {
  let dynamicWidgetID: String
  let dynamicWidgetPropsJSON: String
  let dynamicWidgetEnvironmentJSON: String
}

private final class RecordingDynamicWidgetRuntimeBoundary {
  private let output: String?
  private(set) var invocations: [DynamicWidgetRuntimeInvocation] = []

  init(output: String?) {
    self.output = output
  }

  func render(
    dynamicWidgetID: String,
    dynamicWidgetPropsJSON: String,
    dynamicWidgetEnvironmentJSON: String
  ) -> String? {
    invocations.append(
      DynamicWidgetRuntimeInvocation(
        dynamicWidgetID: dynamicWidgetID,
        dynamicWidgetPropsJSON: dynamicWidgetPropsJSON,
        dynamicWidgetEnvironmentJSON: dynamicWidgetEnvironmentJSON
      )
    )
    return output
  }
}

private final class InMemoryDynamicWidgetRenderPropsStorage: DynamicWidgetPropsStorage {
  var values: [String: String] = [:]

  func string(forKey key: String) throws -> String? {
    values[key]
  }

  func set(_ value: String, forKey key: String) throws {
    values[key] = value
  }
}
