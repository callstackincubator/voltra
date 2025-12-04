import SwiftUI
import AppIntents

public struct DynamicButton: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    init(_ component: VoltraComponent) {
        self.component = component
    }

    private var activityId: String {
        voltraEnvironment.activityId
    }
    
    private var componentId: String {
        component.id!
    }
    
    @ViewBuilder
    private var buttonLabel: some View {
        if let children = component.children {
            switch children {
            case .component(let component):
                AnyView(voltraEnvironment.buildView(for: [component]))
            case .components(let components):
                AnyView(voltraEnvironment.buildView(for: components))
            case .text(let text):
                Text(text)
            }
        } else {
            Text("Button")
        }
    }
    
    public var body: some View {
        Button(intent: VoltraInteractionIntent(activityId: activityId, componentId: componentId), label: {
            buttonLabel
        })
        .buttonStyle(.plain)
        .voltraModifiers(component)
    }
}
