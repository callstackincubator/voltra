import SwiftUI

public struct VoltraForm: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        Form {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
