import SwiftUI

public struct VoltraVSplitView: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
#if os(macOS)
        VSplitView {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
#else
        EmptyView()
#endif
    }
}
