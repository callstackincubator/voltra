import SwiftUI

public struct VoltraList: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        List {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
