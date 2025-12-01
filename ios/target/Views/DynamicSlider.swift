//
//  DynamicSlider.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicSlider: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    @State
    private var state: Double

    private let component: VoltraUIComponent

    // Type-safe parameter access
    private var params: SliderParameters? {
        component.parameters(SliderParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        let params = component.parameters(SliderParameters.self)
        self.state = params?.defaultValue ?? 0
        self.component = component
    }

    public var body: some View {
#if !os(tvOS)
        Slider(value: $state.onChange({ newState in
            var newComponent = component
            newComponent.state = .double(newState)

            voltraUIEnvironment.callback(newComponent)
        })) {
            Text("\(component.props?["title"] as? String ?? "")")
        } minimumValueLabel: {
            Text("\(params?.minimumLabel ?? "")")
        } maximumValueLabel: {
            Text("\(params?.maximumLabel ?? "")")
        }
        .voltraUIModifiers(component)
#else
        EmptyView()
#endif
    }
}
