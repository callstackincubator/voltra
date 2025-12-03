import SwiftUI

public struct DynamicSecureField: View {
    @Environment(\.internalVoltraEnvironment)
    var voltraEnvironment

    @State
    private var state: String

    private let component: VoltraComponent

    private struct SecureFieldParameters: ComponentParameters {
        let defaultValue: String?
    }

    private var params: SecureFieldParameters? {
        component.parameters(SecureFieldParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(SecureFieldParameters.self)
        self.state = params?.defaultValue ?? ""
    }

    public var body: some View {
        SecureField(
            "\(component.props?["title"] as? String ?? "")",
            text: $state
        )
        .voltraModifiers(component)
    }
}
