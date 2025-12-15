import SwiftUI

public struct VoltraHStack: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        let params = node.parameters(HStackParameters.self)
        let spacing = params.spacing
        let alignmentStr = params.alignment.lowercased()

        let alignment: VerticalAlignment = switch alignmentStr {
        case "top": .top
        case "bottom": .bottom
        case "center": .center
        case "firsttextbaseline": .firstTextBaseline
        case "lasttextbaseline": .lastTextBaseline
        default: .center
        }

        HStack(alignment: alignment, spacing: spacing) {
            VoltraChildrenView(node: node)
        }
        .applyStyle(node.style)
    }
}
