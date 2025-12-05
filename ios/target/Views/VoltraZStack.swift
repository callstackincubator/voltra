import SwiftUI

public struct VoltraZStack: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(ZStackParameters.self)
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
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
