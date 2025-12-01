//
//  DynamicTextField.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicTextField: View {
    @Environment(\.internalVoltraUIEnvironment)
    var voltraUIEnvironment

    @State
    private var state: String

    private let component: VoltraUIComponent
    
    private struct TextFieldParameters: ComponentParameters {
        let defaultValue: String?
    }
    
    private var params: TextFieldParameters? {
        component.parameters(TextFieldParameters.self)
    }

    init(_ component: VoltraUIComponent) {
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

                voltraUIEnvironment.callback(newComponent)
            })
        )
        .voltraUIModifiers(component)
    }
}
