import SwiftUI

public struct DynamicTextEditor: View {
    @Environment(\.internalVoltraEnvironment)
    var voltraEnvironment

    @State
    private var state: String

    private let component: VoltraComponent

    private struct TextEditorParameters: ComponentParameters {
        let defaultValue: String?
    }

    private var params: TextEditorParameters? {
        component.parameters(TextEditorParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(TextEditorParameters.self)
        self.state = params?.defaultValue ?? ""
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
        DynamicTextField(component)
            .voltraModifiers(component)
#endif
    }
}
