import SwiftUI
import AppIntents

public struct DynamicButton: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: ButtonParameters? {
        component.parameters(ButtonParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        if let activityId = voltraEnvironment.activityId,
           let componentId = component.id {
            Button(intent: VoltraInteractionIntent(activityId: activityId, componentId: componentId), label: {
                Text(params?.title ?? "Button")
            })
            .voltraModifiers(component)
        } else {
            // Fallback to callback if activityId or componentId is missing
            Button(action: {
                voltraEnvironment.callback(component)
            }, label: {
                Text(params?.title ?? "Button")
            })
            .voltraModifiers(component)
        }
    }
}
