import SwiftUI

public struct VoltraDivider: VoltraView {
    public typealias Parameters = EmptyParameters

    public let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        Divider()
            .applyStyle(element.style)
    }
}
