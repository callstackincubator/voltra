import SwiftUI

public struct VoltraLabel: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let params = element.parameters(LabelParameters.self)
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
