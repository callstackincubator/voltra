//
//  DynamicZStack.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicZStack: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    private var params: ZStackParameters? {
        component.parameters(ZStackParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        let alignmentStr = params?.alignment?.lowercased()
        
        let alignment: Alignment = switch alignmentStr {
        case "leading": .leading
        case "trailing": .trailing
        case "top": .top
        case "bottom": .bottom
        case "topleading": .topLeading
        case "toptrailing": .topTrailing
        case "bottomleading": .bottomLeading
        case "bottomtrailing": .bottomTrailing
        case "center": .center
        default: .center
        }
        
        ZStack(alignment: alignment) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraUIEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraUIEnvironment.buildView(for: components))
                case .text:
                    // ZStack shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraUIModifiers(component)
    }
}
