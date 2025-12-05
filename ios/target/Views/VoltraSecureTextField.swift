import SwiftUI

private struct SecureFieldParameters: ComponentParameters {
    let defaultValue: String?
}

public struct VoltraSecureField: View {
    private let component: VoltraComponent
    
    @State
    private var state: String

    public init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(SecureFieldParameters.self)
        self.state = params.defaultValue ?? ""
    }

    public var body: some View {
        SecureField(
            "\(component.props?["title"] as? String ?? "")",
            text: $state
        )
        .voltraModifiers(component)
    }
}
