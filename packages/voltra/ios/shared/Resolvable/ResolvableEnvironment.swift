import Foundation

public struct ResolvableEnvironment: Hashable {
  public let renderingMode: String?
  public let showsWidgetContainerBackground: Bool?

  public init(renderingMode: String? = nil, showsWidgetContainerBackground: Bool? = nil) {
    self.renderingMode = renderingMode
    self.showsWidgetContainerBackground = showsWidgetContainerBackground
  }

  func value(for id: ResolvableEnvironmentID) -> JSONValue? {
    switch id {
    case .renderingMode:
      guard let renderingMode else { return nil }
      return .string(renderingMode)
    case .showsWidgetContainerBackground:
      guard let showsWidgetContainerBackground else { return nil }
      return .bool(showsWidgetContainerBackground)
    default:
      // Android Material color env keys are inert on iOS; payloads should not rely on them here.
      return nil
    }
  }
}
