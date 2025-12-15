import SwiftUI
import AppIntents

public struct VoltraToggle: View {
    private let node: VoltraNode
    private let title: String

    @Environment(\.voltraEnvironment)
    private var voltraEnvironment

    public init(_ node: VoltraNode) {
        self.node = node
        self.title = node.props?["title"]?.stringValue ?? ""
    }

    public var body: some View {
        let params = node.parameters(ToggleParameters.self)
        Toggle(
            isOn: params.defaultValue ?? false,
            intent: VoltraInteractionIntent(
                activityId: voltraEnvironment.activityId,
                componentId: node.id ?? "unknown",
                payload: (params.defaultValue ?? false) ? "false" : "true"
            )
        ) {
            Text(title)
        }
        .applyStyle(node.style)
    }
}
