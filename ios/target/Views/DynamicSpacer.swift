import SwiftUI

public struct DynamicSpacer: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: SpacerParameters? {
        component.parameters(SpacerParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        Spacer(minLength: params?.minLength.map { CGFloat($0) })
            .voltraModifiers(component)
    }
}
