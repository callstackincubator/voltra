import SwiftUI

public struct VoltraLabel: VoltraView {
    public typealias Parameters = LabelParameters

    public let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        if let systemImage = params.systemImage {
            Label(
                params.title ?? "Label",
                systemImage: systemImage
            )
            .applyStyle(element.style)
        } else {
            VoltraText(element)
                .applyStyle(element.style)
        }
    }
}
