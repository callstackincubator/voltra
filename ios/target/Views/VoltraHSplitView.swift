import SwiftUI

public struct VoltraHSplitView: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
#if os(macOS)
        HSplitView {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
#else
        EmptyView()
            .voltraModifiers(component)
#endif
    }
}
