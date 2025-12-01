//
//  DynamicLabel.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicLabel: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent
    
    private var params: LabelParameters? {
        component.parameters(LabelParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        if let systemImage = params?.systemImage {
            Label(
                params?.title ?? "Label",
                systemImage: systemImage
            )
            .voltraUIModifiers(component)
        } else {
            DynamicText(component)
                .voltraUIModifiers(component)
        }
    }
}
