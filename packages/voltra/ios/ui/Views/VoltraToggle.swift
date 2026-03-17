import AppIntents
import SwiftUI

public struct VoltraToggle: VoltraView {
  public typealias Parameters = ToggleParameters

  public let element: VoltraElement
  private let title: String

  @Environment(\.voltraEnvironment)
  private var voltraEnvironment

  public init(_ element: VoltraElement) {
    self.element = element
    title = element.props?["title"]?.stringValue ?? ""
  }

  public var body: some View {
    if #available(iOS 17.0, *) {
      Toggle(
        isOn: params.defaultValue,
        intent: VoltraInteractionIntent(
          activityId: voltraEnvironment.activityId,
          componentId: element.id ?? "unknown",
          payload: (params.defaultValue) ? "false" : "true"
        )
      ) {
        Text(title)
      }
      .applyStyle(element.style)
    } else {
      // Fallback for iOS 16.x: Toggle with static value (intents not supported)
      Toggle(isOn: .constant(params.defaultValue)) {
        Text(title)
      }
      .applyStyle(element.style)
    }
  }
}
