import SwiftUI

public struct VoltraLabel: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(LabelParameters.self)
        if let systemImage = params.systemImage {
            Label(
                params.title ?? "Label",
                systemImage: systemImage
            )
            .applyStyle(component.style)
        } else {
            VoltraText(component)
                .applyStyle(component.style)
        }
    }
}
