import SwiftUI
import AppIntents

public struct DynamicToggle: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let title: String
    private let component: VoltraComponent

    private var params: ToggleParameters? {
        component.parameters(ToggleParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.title = component.props?["title"] as? String ?? ""
        self.component = component
    }

    public var body: some View {
        Toggle(
            isOn: params?.defaultValue ?? false,
            intent: VoltraInteractionIntent(
                activityId: voltraEnvironment.activityId ?? "unknown",
                componentId: component.id ?? "unknown",
                payload: (params?.defaultValue ?? false) ? "false" : "true"
            )
        ) {
            Text(title)
        }
        .voltraModifiers(component)
    }
}
