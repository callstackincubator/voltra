import SwiftUI
import AppIntents

public struct VoltraToggle: View {
    private let component: VoltraComponent
    private let title: String
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    public init(_ component: VoltraComponent) {
        self.component = component
        self.title = component.props?["title"] as? String ?? ""
    }

    public var body: some View {
        let params = component.parameters(ToggleParameters.self)
        Toggle(
            isOn: params.defaultValue ?? false,
            intent: VoltraInteractionIntent(
                activityId: voltraEnvironment.activityId,
                componentId: component.id ?? "unknown",
                payload: (params.defaultValue ?? false) ? "false" : "true"
            )
        ) {
            Text(title)
        }
        .voltraModifiers(component)
    }
}
