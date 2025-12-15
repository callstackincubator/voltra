import SwiftUI

public struct VoltraZStack: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        let params = node.parameters(ZStackParameters.self)
        let alignmentStr = params.alignment?.lowercased()

        let alignment: Alignment = switch alignmentStr {
        case "leading": .leading
        case "trailing": .trailing
        case "top": .top
        case "bottom": .bottom
        case "topleading": .topLeading
        case "toptrailing": .topTrailing
        case "bottomleading": .bottomLeading
        case "bottomtrailing": .bottomTrailing
        case "center": .center
        default: .center
        }

        ZStack(alignment: alignment) {
            VoltraChildrenView(node: node)
        }
        .applyStyle(node.style)
    }
}
