import SwiftUI

public struct VoltraDisclosureGroup: View {
    private let component: VoltraComponent

    @State
    private var isExpanded: Bool

    public init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(DisclosureGroupParameters.self)
        _isExpanded = State(initialValue: params.isExpanded ?? false)
    }

    public var body: some View {
#if !os(tvOS) && !os(watchOS)
        DisclosureGroup("\(component.props?["title"] as? String ?? "")", isExpanded: $isExpanded) {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
#else
        VoltraVStack(component)
#endif
    }
}
