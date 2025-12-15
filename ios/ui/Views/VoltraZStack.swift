import SwiftUI

public struct VoltraZStack: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let params = element.parameters(ZStackParameters.self)
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
            element.children ?? .empty
        }
        .applyStyle(element.style)
    }
}
