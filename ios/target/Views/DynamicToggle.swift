//
//  DynamicToggle.swift
//  VoltraUI
//
//  Created by Saul Sharma.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicToggle: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    @State
    private var state: Bool

    private let title: String
    private let component: VoltraUIComponent

    private var params: ToggleParameters? {
        component.parameters(ToggleParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        let params = component.parameters(ToggleParameters.self)
        self.title = component.props?["title"] as? String ?? ""
        self.state = params?.defaultValue ?? false
        self.component = component
    }

    public var body: some View {
        Toggle(isOn: $state.onChange({ newState in
            var newComponent = component
            newComponent.state = .bool(newState)

            voltraUIEnvironment.callback(newComponent)
        })) {
            Text(title)
        }
        .voltraUIModifiers(component)
    }
}
