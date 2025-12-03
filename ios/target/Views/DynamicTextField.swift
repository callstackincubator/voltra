import SwiftUI

public struct DynamicTextField: View {
    @Environment(\.internalVoltraEnvironment)
    var voltraEnvironment

    @State
    private var state: String

    private let component: VoltraComponent
    
    private struct TextFieldParameters: ComponentParameters {
        let defaultValue: String?
    }
    
    private var params: TextFieldParameters? {
        component.parameters(TextFieldParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(TextFieldParameters.self)
        self.state = params?.defaultValue ?? ""
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
