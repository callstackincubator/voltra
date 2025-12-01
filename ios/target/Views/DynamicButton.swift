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
        Button(action: {
            voltraUIEnvironment.callback(component)
        }, label: {
            Text(params?.title ?? "Button")
        })
        .voltraUIModifiers(component)
    }
}
