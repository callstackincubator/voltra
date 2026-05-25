import SwiftUI

public struct VoltraLink: VoltraView {
  public typealias Parameters = LinkParameters
  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    if let urlString = params.destination,
       let url = VoltraDeepLinkResolver.resolveUrl(urlString)
    {
      Link(destination: url) {
        element.children ?? .empty
      }
      .applyStyle(element.style)
    } else {
      // Fallback: render children without link if destination is invalid
      (element.children ?? .empty)
        .applyStyle(element.style)
    }
  }
}
