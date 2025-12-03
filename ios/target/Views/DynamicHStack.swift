import SwiftUI

public struct DynamicHStack: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: HStackParameters? {
        component.parameters(HStackParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let spacing: CGFloat? = params?.spacing.map { CGFloat($0) }
        let alignmentStr = params?.alignment?.lowercased()
        
        let alignment: VerticalAlignment = switch alignmentStr {
        case "top": .top
        case "bottom": .bottom
        case "center": .center
        case "firsttextbaseline": .firstTextBaseline
        case "lasttextbaseline": .lastTextBaseline
        default: .center
        }
        
        HStack(alignment: alignment, spacing: spacing) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraEnvironment.buildView(for: components))
                case .text:
                    // HStack shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraModifiers(component)
    }
}
