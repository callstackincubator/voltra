import SwiftUI
import AppIntents

public struct VoltraButton: View {
    private let element: VoltraElement
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    public init(_ element: VoltraElement) {
        self.element = element
    }
    
    public var body: some View {
        Button(intent: VoltraInteractionIntent(activityId: voltraEnvironment.activityId, componentId: element.id!), label: {
            element.children ?? .text("Button")
        })
        .buttonStyle(.plain)
        .applyStyle(element.style)
    }
}
