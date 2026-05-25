import SwiftUI

public enum VoltraWidgetRenderingMode {
  case fullColor
  case accented
  case vibrant
  case unknown
}

public struct VoltraWidgetEnvironment {
  public let isHomeScreenWidget: Bool
  public let renderingMode: VoltraWidgetRenderingMode
  public let showsContainerBackground: Bool

  var usesReducedBackgroundPresentation: Bool {
    renderingMode != .fullColor || !showsContainerBackground
  }

  var suppressesDecorativeContainerEffects: Bool {
    isHomeScreenWidget && usesReducedBackgroundPresentation
  }

  public init(
    isHomeScreenWidget: Bool,
    renderingMode: VoltraWidgetRenderingMode,
    showsContainerBackground: Bool
  ) {
    self.isHomeScreenWidget = isHomeScreenWidget
    self.renderingMode = renderingMode
    self.showsContainerBackground = showsContainerBackground
  }
}

struct VoltraEnvironment {
  /// Activity ID for Live Activity interactions
  let activityId: String

  /// Widget-specific presentation context, when rendering inside WidgetKit.
  let widget: VoltraWidgetEnvironment?
}

public struct Voltra: View {
  /// Pre-parsed root node
  public var root: VoltraNode

  /// Activity ID for Live Activity interactions
  public var activityId: String

  /// Widget-specific presentation context, when rendering inside WidgetKit.
  var widget: VoltraWidgetEnvironment?

  /// Initialize Voltra
  ///
  /// - Parameter root: Pre-parsed root VoltraNode
  /// - Parameter callback: Handler for element interactions
  /// - Parameter activityId: Activity ID for Live Activity interactions
  /// - Parameter widget: Widget rendering context used to adapt Voltra output for WidgetKit surfaces
  public init(root: VoltraNode, activityId: String, widget: VoltraWidgetEnvironment? = nil) {
    self.root = root
    self.activityId = activityId
    self.widget = widget
  }

  /// Generated body for SwiftUI
  public var body: some View {
    root
      .environment(\.voltraEnvironment, VoltraEnvironment(
        activityId: activityId,
        widget: widget
      ))
  }
}

private struct VoltraEnvironmentKey: EnvironmentKey {
  static let defaultValue: VoltraEnvironment = .init(
    activityId: "",
    widget: nil
  )
}

extension EnvironmentValues {
  var voltraEnvironment: VoltraEnvironment {
    get { self[VoltraEnvironmentKey.self] }
    set { self[VoltraEnvironmentKey.self] = newValue }
  }
}
