import SwiftUI

public struct DynamicVStack: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: VStackParameters? {
        component.parameters(VStackParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let spacing: CGFloat? = params?.spacing.map { CGFloat($0) }
        let alignmentStr = params?.alignment?.lowercased()
        
        let alignment: HorizontalAlignment = switch alignmentStr {
        case "leading": .leading
        case "trailing": .trailing
        case "center": .center
        default: .center
        }
        
        VStack(alignment: alignment, spacing: spacing) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraEnvironment.buildView(for: components))
                case .text:
                    // VStack shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraModifiers(component)
    }
}
