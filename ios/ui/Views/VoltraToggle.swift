import SwiftUI
import AppIntents

public struct VoltraToggle: VoltraView {
    public typealias Parameters = ToggleParameters

    public let element: VoltraElement
    private let title: String

    @Environment(\.voltraEnvironment)
    private var voltraEnvironment

    public init(_ element: VoltraElement) {
        self.element = element
        self.title = element.props?["title"]?.stringValue ?? ""
    }

    public var body: some View {
        Toggle(
            isOn: params.defaultValue ?? false,
            intent: VoltraInteractionIntent(
                activityId: voltraEnvironment.activityId,
                componentId: element.id ?? "unknown",
                payload: (params.defaultValue ?? false) ? "false" : "true"
            )
        ) {
            Text(title)
        }
        .applyStyle(element.style)
    }
}
