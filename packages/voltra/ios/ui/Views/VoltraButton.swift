import SwiftUI

public struct VoltraButton: VoltraView {
  public typealias Parameters = ButtonParameters

  public let element: VoltraElement

  @Environment(\.voltraEnvironment)
  private var voltraEnvironment

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    if #available(iOS 17.0, *) {
      Button(intent: VoltraInteractionIntent(activityId: voltraEnvironment.activityId, componentId: element.id ?? ""), label: {
        element.children ?? .text("Button")
      })
      .voltraButtonStyle(params.buttonStyle)
      .applyStyle(element.style)
    } else {
      // Fallback for iOS 16.x: Button with no action (intents not supported)
      Button(action: {}) {
        element.children ?? .text("Button")
      }
      .voltraButtonStyle(params.buttonStyle)
      .applyStyle(element.style)
    }
  }
}

// MARK: - Button Style Helper

private extension View {
  @ViewBuilder
  func voltraButtonStyle(_ style: String?) -> some View {
    if let style = style {
      switch style.lowercased() {
      case "automatic":
        buttonStyle(.automatic)
      case "bordered":
        buttonStyle(.bordered)
      case "borderedprominent":
        buttonStyle(.borderedProminent)
      case "borderless":
        buttonStyle(.borderless)
      case "plain":
        buttonStyle(.plain)
      default:
        buttonStyle(.plain)
      }
    } else {
      self
    }
  }
}
