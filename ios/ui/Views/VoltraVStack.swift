import SwiftUI

public struct VoltraVStack: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(VStackParameters.self)
        let spacing: CGFloat? = params.spacing.map { CGFloat($0) }
        let alignmentStr = params.alignment?.lowercased()
        
        let alignment: HorizontalAlignment = switch alignmentStr {
        case "leading": .leading
        case "trailing": .trailing
        case "center": .center
        default: .leading
        }
        
        // Check if this VStack should expand to fill space
        let shouldExpand = component.style?["flexGrow"] as? NSNumber != nil ||
                          (component.style?["flex"] as? NSNumber != nil &&
                           (component.style?["flex"] as? NSNumber)?.doubleValue ?? 0 > 0)

        VStack(alignment: alignment, spacing: spacing) {
            VoltraChildrenView(component: component)
        }
        .frame(maxWidth: .infinity, maxHeight: shouldExpand ? .infinity : nil, alignment: Alignment(horizontal: alignment, vertical: .center))
        .voltraModifiers(component)
    }
}
