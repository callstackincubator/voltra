//
//  DynamicPicker.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicPicker: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    @State
    private var state: Double

    private let component: VoltraUIComponent

    private struct PickerParameters: ComponentParameters {
        let defaultValue: Double?
    }

    private var params: PickerParameters? {
        component.parameters(PickerParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
        let params = component.parameters(PickerParameters.self)
        self.state = params?.defaultValue ?? 0
    }

    public var body: some View {
        Picker(component.props?["title"] as? String ?? "", selection: $state.onChange({ newState in
            var newComponent = component
            newComponent.state = .double(newState)

            voltraUIEnvironment.callback(newComponent)
        })) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraUIEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraUIEnvironment.buildView(for: components))
                case .text:
                    // Picker shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraUIModifiers(component)
    }
}
