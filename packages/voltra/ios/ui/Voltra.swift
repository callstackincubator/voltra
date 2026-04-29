import SwiftUI

struct VoltraEnvironment {
  /// Activity ID for Live Activity interactions
  let activityId: String

  /// Snapshot of runtime-only values used by resolvable payloads.
  let resolvableEnvironment: ResolvableEnvironment
}

public struct Voltra: View {
  /// Pre-parsed root node
  public var root: VoltraNode

  /// Activity ID for Live Activity interactions
  public var activityId: String

  /// Snapshot of runtime-only values used by resolvable payloads.
  public var resolvableEnvironment: ResolvableEnvironment

  /// Initialize Voltra
  ///
  /// - Parameter root: Pre-parsed root VoltraNode
  /// - Parameter callback: Handler for element interactions
  /// - Parameter activityId: Activity ID for Live Activity interactions
  public init(root: VoltraNode, activityId: String, resolvableEnvironment: ResolvableEnvironment = .init()) {
    self.root = root
    self.activityId = activityId
    self.resolvableEnvironment = resolvableEnvironment
  }

  /// Generated body for SwiftUI
  public var body: some View {
    root
      .environment(\.voltraEnvironment, VoltraEnvironment(
        activityId: activityId,
        resolvableEnvironment: resolvableEnvironment
      ))
      // Identity must change when resolvable env changes. Without this (and without
      // `resolvableEnvironment` in `VoltraElement.==`), SwiftUI can skip updates when
      // switching back to a previously seen `WidgetRenderingMode` (e.g. accented).
      .id(resolvableSubtreeIdentity)
  }

  private var resolvableSubtreeIdentity: String {
    let mode = resolvableEnvironment.renderingMode ?? ""
    let bg: String
    if let shows = resolvableEnvironment.showsWidgetContainerBackground {
      bg = shows ? "1" : "0"
    } else {
      bg = "nil"
    }
    return "\(mode)|\(bg)"
  }
}

private struct VoltraEnvironmentKey: EnvironmentKey {
  static let defaultValue: VoltraEnvironment = .init(
    activityId: "",
    resolvableEnvironment: .init()
  )
}

extension EnvironmentValues {
  var voltraEnvironment: VoltraEnvironment {
    get { self[VoltraEnvironmentKey.self] }
    set { self[VoltraEnvironmentKey.self] = newValue }
  }
}
