import SwiftUI

public struct VoltraVStack: View {
    private let node: VoltraNode
    
    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        let params = node.parameters(VStackParameters.self)
        let spacing = params.spacing
        let alignmentStr = params.alignment.lowercased()
        
        let alignment: HorizontalAlignment = switch alignmentStr {
        case "leading": .leading
        case "trailing": .trailing
        case "center": .center
        default: .leading
        }

        VStack(alignment: alignment, spacing: spacing) {
            VoltraChildrenView(node: node)
        }
        .applyStyle(node.style)
    }
}
