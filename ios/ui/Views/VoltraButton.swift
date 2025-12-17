import SwiftUI

public struct VoltraButton: VoltraView {
    public typealias Parameters = EmptyParameters

    public let element: VoltraElement
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    public init(_ element: VoltraElement) {
        self.element = element
    }
    
    public var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: VoltraInteractionIntent(activityId: voltraEnvironment.activityId, componentId: element.id!), label: {
                element.children ?? .text("Button")
            })
            .buttonStyle(.plain)
            .applyStyle(element.style)
        } else {
            // Fallback for iOS 16.x: Button with no action (intents not supported)
            Button(action: {}) {
                element.children ?? .text("Button")
            }
            .buttonStyle(.plain)
            .applyStyle(element.style)
        }
    }
}
