import SwiftUI

public struct VoltraDivider: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        Divider()
            .applyStyle(element.style)
    }
}
