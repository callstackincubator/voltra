import SwiftUI
import AppIntents

public struct VoltraButton: View {
    private let node: VoltraNode
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    public init(_ node: VoltraNode) {
        self.node = node
    }
    
    public var body: some View {
        Button(intent: VoltraInteractionIntent(activityId: voltraEnvironment.activityId, componentId: node.id!), label: {
            if let children = node.children {
                switch children {
                case .node(let childNode):
                    VoltraChildrenView(nodes: [childNode])
                case .nodes(let nodes):
                    VoltraChildrenView(nodes: nodes)
                case .text(let text):
                    Text(text)
                }
            } else {
                Text("Button")
            }
        })
        .buttonStyle(.plain)
        .applyStyle(node.style)
    }
}
