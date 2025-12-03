import SwiftUI

public struct DynamicLabel: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent
    
    private var params: LabelParameters? {
        component.parameters(LabelParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        if let systemImage = params?.systemImage {
            Label(
                params?.title ?? "Label",
                systemImage: systemImage
            )
            .voltraModifiers(component)
        } else {
            DynamicText(component)
                .voltraModifiers(component)
        }
    }
}
