//
//  DynamicList.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicList: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        List {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraUIEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraUIEnvironment.buildView(for: components))
                case .text:
                    // List shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraUIModifiers(component)
    }
}
