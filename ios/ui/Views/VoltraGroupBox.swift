import SwiftUI

public struct VoltraGroupBox: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
#if !os(tvOS) && !os(watchOS)
        GroupBox {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
#else
        VoltraVStack(component)
            .voltraModifiers(component)
#endif
    }
}
