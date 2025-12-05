import SwiftUI

private struct TextFieldParameters: ComponentParameters {
    let defaultValue: String?
}

public struct VoltraTextField: View {
    private let component: VoltraComponent
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    @State
    private var state: String

    public init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(TextFieldParameters.self)
        self.state = params.defaultValue ?? ""
    }

    public var body: some View {
        TextField(
            "\(component.props?["title"] as? String ?? "")",
            text: $state.onChange({ _ in
                var newComponent = component
                newComponent.state = .string(state)

                voltraEnvironment.callback(newComponent)
            })
        )
        .voltraModifiers(component)
    }
}
