import SwiftUI

public struct DynamicZStack: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: ZStackParameters? {
        component.parameters(ZStackParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let alignmentStr = params?.alignment?.lowercased()
        
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
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraEnvironment.buildView(for: components))
                case .text:
                    // ZStack shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraModifiers(component)
    }
}
