import SwiftUI

public struct VoltraSpacer: VoltraView {
  public typealias Parameters = SpacerParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    Spacer(minLength: params.minLength.map { CGFloat($0) })
      .applyStyle(element.style)
  }
}
