import SwiftUI

public struct DynamicDivider: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        Divider()
            .voltraModifiers(component)
    }
}
