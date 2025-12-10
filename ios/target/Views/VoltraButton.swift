import SwiftUI
import AppIntents

public struct VoltraButton: View {
    private let component: VoltraComponent
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }
    
    public var body: some View {
        Button(intent: VoltraInteractionIntent(activityId: voltraEnvironment.activityId, componentId: component.id!), label: {
            if let children = component.children {
                switch children {
                case .component(let childComponent):
                    VoltraChildrenView(components: [childComponent])
                case .components(let components):
                    VoltraChildrenView(components: components)
                case .text(let text):
                    Text(text)
                }
            } else {
                Text("Button")
            }
        })
        .buttonStyle(.plain)
        .voltraModifiers(component)
    }
}
