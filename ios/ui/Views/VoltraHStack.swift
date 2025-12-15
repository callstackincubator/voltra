import SwiftUI

public struct VoltraHStack: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let params = element.parameters(HStackParameters.self)
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
            element.children ?? .empty
        }
        .applyStyle(element.style)
    }
}
