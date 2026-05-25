import SwiftUI

public struct VoltraMask: VoltraView {
  public typealias Parameters = EmptyParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    // Get the mask element from element props
    let maskElement = element.componentProp("maskElement")

    // Render children as the content to be masked
    (element.children ?? .empty)
      .mask {
        maskElement
      }
      .applyStyle(element.style)
  }
}
