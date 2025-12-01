//
//  DynamicSecureField.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicSecureField: View {
    @Environment(\.internalVoltraUIEnvironment)
    var voltraUIEnvironment

    @State
    private var state: String

    private let component: VoltraUIComponent

    private struct SecureFieldParameters: ComponentParameters {
        let defaultValue: String?
    }

    private var params: SecureFieldParameters? {
        component.parameters(SecureFieldParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
        let params = component.parameters(SecureFieldParameters.self)
        self.state = params?.defaultValue ?? ""
    }

    public var body: some View {
        SecureField(
            "\(component.props?["title"] as? String ?? "")",
            text: $state
        )
        .voltraUIModifiers(component)
    }
}
