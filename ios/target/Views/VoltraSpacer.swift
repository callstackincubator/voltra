import SwiftUI

public struct VoltraSpacer: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(SpacerParameters.self)
        Spacer(minLength: params.minLength.map { CGFloat($0) })
            .voltraModifiers(component)
    }
}
