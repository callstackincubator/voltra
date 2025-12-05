import SwiftUI

private struct TextEditorParameters: ComponentParameters {
    let defaultValue: String?
}

public struct VoltraTextEditor: View {
    private let component: VoltraComponent
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    @State
    private var state: String

    public init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(TextEditorParameters.self)
        self.state = params.defaultValue ?? ""
    }

    public var body: some View {
#if os(iOS) && os(macOS)
        TextEditor(text: $state.onChange({ _ in
            var newComponent = component
            newComponent.state = .string(state)

            voltraEnvironment.callback(newComponent)
        }))
        .voltraModifiers(component)
#else
        VoltraTextField(component)
            .voltraModifiers(component)
#endif
    }
}
