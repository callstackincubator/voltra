import SwiftUI

/// Voltra: Mask
///
/// Masks content using any Voltra element as the mask shape.
/// The alpha channel of the maskElement determines visibility.
@available(iOS 15.0, macOS 12.0, *)
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

