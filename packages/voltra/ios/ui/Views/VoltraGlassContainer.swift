import SwiftUI

public struct VoltraGlassContainer: VoltraView {
  public typealias Parameters = GlassContainerParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    if let children = element.children {
      if #available(iOS 26.0, *) {
        let spacing = params.spacing ?? 0.0
        GlassEffectContainer(spacing: CGFloat(spacing)) {
          children
        }.applyStyle(element.style)
      } else {
        Group {
          children
        }.applyStyle(element.style)
      }
    } else {
      EmptyView()
    }
  }
}
