import SwiftUI

public struct VoltraVStack: View {
    private let element: VoltraElement
    
    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let params = element.parameters(VStackParameters.self)
        let spacing = params.spacing
        let alignmentStr = params.alignment.lowercased()
        
        let alignment: HorizontalAlignment = switch alignmentStr {
        case "leading": .leading
        case "trailing": .trailing
        case "center": .center
        default: .leading
        }

        VStack(alignment: alignment, spacing: spacing) {
            element.children ?? .empty
        }
        .applyStyle(element.style)
    }
}
