import SwiftUI

public struct VoltraNavigationView: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        NavigationView {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
