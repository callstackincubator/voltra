//
//  DynamicButton.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI
import AppIntents

public struct DynamicButton: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    private var params: ButtonParameters? {
        component.parameters(ButtonParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        if let activityId = voltraUIEnvironment.activityId,
           let componentId = component.id {
            Button(intent: VoltraInteractionIntent(activityId: activityId, componentId: componentId), label: {
                Text(params?.title ?? "Button")
            })
            .voltraUIModifiers(component)
        } else {
            // Fallback to callback if activityId or componentId is missing
            Button(action: {
                voltraUIEnvironment.callback(component)
            }, label: {
                Text(params?.title ?? "Button")
            })
            .voltraUIModifiers(component)
        }
    }
}
