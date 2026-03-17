import SwiftUI

struct VoltraEnvironment {
  /// Activity ID for Live Activity interactions
  let activityId: String
}

public struct Voltra: View {
  /// Pre-parsed root node
  public var root: VoltraNode

  /// Activity ID for Live Activity interactions
  public var activityId: String

  /// Initialize Voltra
  ///
  /// - Parameter root: Pre-parsed root VoltraNode
  /// - Parameter callback: Handler for element interactions
  /// - Parameter activityId: Activity ID for Live Activity interactions
  public init(root: VoltraNode, activityId: String) {
    self.root = root
    self.activityId = activityId
  }

  /// Generated body for SwiftUI
  public var body: some View {
    root
      .environment(\.voltraEnvironment, VoltraEnvironment(
        activityId: activityId
      ))
  }
}

private struct VoltraEnvironmentKey: EnvironmentKey {
  static let defaultValue: VoltraEnvironment = .init(
    activityId: ""
  )
}

extension EnvironmentValues {
  var voltraEnvironment: VoltraEnvironment {
    get { self[VoltraEnvironmentKey.self] }
    set { self[VoltraEnvironmentKey.self] = newValue }
  }
}
