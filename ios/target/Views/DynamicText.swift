//
//  DynamicText.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicText: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        let textContent: String = {
            if let children = component.children, case .text(let text) = children {
                return text
            }
            return ""
        }()
        
        Text(.init(textContent))
            .voltraUIModifiers(component)
    }
}
