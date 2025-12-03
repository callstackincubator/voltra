import SwiftUI

public struct DynamicDisclosureGroup: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    @State
    private var isExpanded: Bool

    private let component: VoltraComponent

    private var params: DisclosureGroupParameters? {
        component.parameters(DisclosureGroupParameters.self)
    }

    public init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(DisclosureGroupParameters.self)
        _isExpanded = State(initialValue: params?.isExpanded ?? false)
    }

    public var body: some View {
#if !os(tvOS) && !os(watchOS)
        DisclosureGroup("\(component.props?["title"] as? String ?? "")", isExpanded: $isExpanded) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraEnvironment.buildView(for: components))
                case .text:
                    // DisclosureGroup shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraModifiers(component)
#else
        DynamicVStack(component)
#endif
    }
}
