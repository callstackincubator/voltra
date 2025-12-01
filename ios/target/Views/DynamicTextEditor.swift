//
//  DynamicTextEditor.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicTextEditor: View {
    @Environment(\.internalVoltraUIEnvironment)
    var voltraUIEnvironment

    @State
    private var state: String

    private let component: VoltraUIComponent

    private struct TextEditorParameters: ComponentParameters {
        let defaultValue: String?
    }

    private var params: TextEditorParameters? {
        component.parameters(TextEditorParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
        let params = component.parameters(TextEditorParameters.self)
        self.state = params?.defaultValue ?? ""
    }

    public var body: some View {
#if os(iOS) && os(macOS)
        TextEditor(text: $state.onChange({ _ in
            var newComponent = component
            newComponent.state = .string(state)

            voltraUIEnvironment.callback(newComponent)
        }))
        .voltraUIModifiers(component)
#else
        DynamicTextField(component)
            .voltraUIModifiers(component)
#endif
    }
}
