protocol DynamicWidgetPropsPersistence {
  func persistDynamicWidgetProps(_ dynamicWidgetPropsJSON: String, for dynamicWidgetID: String) throws
}

extension DynamicWidgetPropsStore: DynamicWidgetPropsPersistence {}

/// Persists runtime props before requesting a targeted Dynamic Widget timeline reload.
struct DynamicWidgetUpdater {
  private let dynamicWidgetPropsPersistence: any DynamicWidgetPropsPersistence
  private let dynamicWidgetTimelineReload: (String) async throws -> Void

  init(
    dynamicWidgetPropsPersistence: any DynamicWidgetPropsPersistence,
    dynamicWidgetTimelineReload: @escaping (String) async throws -> Void
  ) {
    self.dynamicWidgetPropsPersistence = dynamicWidgetPropsPersistence
    self.dynamicWidgetTimelineReload = dynamicWidgetTimelineReload
  }

  func updateDynamicWidget(
    dynamicWidgetID: String,
    dynamicWidgetPropsJSON: String
  ) async throws {
    try dynamicWidgetPropsPersistence.persistDynamicWidgetProps(
      dynamicWidgetPropsJSON,
      for: dynamicWidgetID
    )
    try await dynamicWidgetTimelineReload(dynamicWidgetID)
  }
}
