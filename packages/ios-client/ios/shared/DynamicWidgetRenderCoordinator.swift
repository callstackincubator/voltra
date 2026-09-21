/// Routes a Dynamic Widget's current persisted props and environment to its runtime boundary.
struct DynamicWidgetRenderCoordinator {
  typealias DynamicWidgetPropsProvider = (_ dynamicWidgetID: String) -> String
  typealias DynamicWidgetRuntimeBoundary = (
    _ dynamicWidgetID: String,
    _ dynamicWidgetPropsJSON: String,
    _ dynamicWidgetEnvironmentJSON: String
  ) -> String?

  private let dynamicWidgetPropsProvider: DynamicWidgetPropsProvider
  private let dynamicWidgetRuntimeBoundary: DynamicWidgetRuntimeBoundary

  init(
    dynamicWidgetPropsProvider: @escaping DynamicWidgetPropsProvider,
    dynamicWidgetRuntimeBoundary: @escaping DynamicWidgetRuntimeBoundary
  ) {
    self.dynamicWidgetPropsProvider = dynamicWidgetPropsProvider
    self.dynamicWidgetRuntimeBoundary = dynamicWidgetRuntimeBoundary
  }

  func renderDynamicWidget(
    dynamicWidgetID: String,
    dynamicWidgetEnvironmentJSON: String
  ) -> String? {
    dynamicWidgetRuntimeBoundary(
      dynamicWidgetID,
      dynamicWidgetPropsProvider(dynamicWidgetID),
      dynamicWidgetEnvironmentJSON
    )
  }
}
