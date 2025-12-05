import SwiftUI

public struct VoltraHStack: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(HStackParameters.self)
        let spacing: CGFloat? = params.spacing.map { CGFloat($0) }
        let alignmentStr = params.alignment?.lowercased()
        
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .voltraModifiers(component)
    }
}
