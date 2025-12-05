import SwiftUI

public struct VoltraDivider: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        Divider()
            .voltraModifiers(component)
    }
}
