import SwiftUI

public struct VoltraVStack: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(VStackParameters.self)
        let spacing = params.spacing
        let alignmentStr = params.alignment.lowercased()
        
        let alignment: HorizontalAlignment = switch alignmentStr {
        case "leading": .leading
        case "trailing": .trailing
        case "center": .center
        default: .leading
        }

        VStack(alignment: alignment, spacing: spacing) {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
