import SwiftUI

public struct DynamicScrollView: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: ScrollViewParameters? {
        component.parameters(ScrollViewParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    private var axes: Axis.Set {
        switch params?.axis?.lowercased() {
        case "horizontal": return .horizontal
        case "vertical": return .vertical
        case "both": return [.horizontal, .vertical]
        default: return .vertical
        }
    }

    public var body: some View {
        ScrollView(axes, showsIndicators: params?.showsIndicators ?? true) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraEnvironment.buildView(for: components))
                case .text:
                    // ScrollView shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraModifiers(component)
    }
}
