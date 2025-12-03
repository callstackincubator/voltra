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
import AppIntents

public struct DynamicToggle: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let title: String
    private let component: VoltraUIComponent

    private var params: ToggleParameters? {
        component.parameters(ToggleParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.title = component.props?["title"] as? String ?? ""
        self.component = component
    }

    public var body: some View {
        Toggle(
            isOn: params?.defaultValue ?? false,
            intent: VoltraInteractionIntent(
                activityId: voltraUIEnvironment.activityId ?? "unknown",
                componentId: component.id ?? "unknown",
                payload: (params?.defaultValue ?? false) ? "false" : "true"
            )
        ) {
            Text(title)
        }
        .voltraUIModifiers(component)
    }
}
