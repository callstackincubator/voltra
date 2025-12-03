import SwiftUI

public struct DynamicVSplitView: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
#if os(macOS)
        VSplitView {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraEnvironment.buildView(for: components))
                case .text:
                    // VSplitView shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraModifiers(component)
#else
        EmptyView()
#endif
    }
}
