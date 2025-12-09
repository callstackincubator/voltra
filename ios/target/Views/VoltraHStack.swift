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
        
        // Check if this HStack should expand to fill space
        let shouldExpand = component.style?["flexGrow"] as? NSNumber != nil ||
                          (component.style?["flex"] as? NSNumber != nil &&
                           (component.style?["flex"] as? NSNumber)?.doubleValue ?? 0 > 0)

        HStack(alignment: alignment, spacing: spacing) {
            VoltraChildrenView(component: component)
        }
        .frame(maxWidth: shouldExpand ? .infinity : nil, maxHeight: .infinity)
        .voltraModifiers(component)
    }
}
