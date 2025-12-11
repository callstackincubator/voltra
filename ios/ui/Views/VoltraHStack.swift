import SwiftUI

public struct VoltraHStack: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(HStackParameters.self)
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
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
