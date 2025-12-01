//
//  DynamicHStack.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicHStack: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    private var params: HStackParameters? {
        component.parameters(HStackParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        let spacing: CGFloat? = params?.spacing.map { CGFloat($0) }
        let alignmentStr = params?.alignment?.lowercased()
        
        let alignment: VerticalAlignment = switch alignmentStr {
        case "top": .top
        case "bottom": .bottom
        case "center": .center
        case "firsttextbaseline": .firstTextBaseline
        case "lasttextbaseline": .lastTextBaseline
        default: .center
        }
        
        HStack(alignment: alignment, spacing: spacing) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraUIEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraUIEnvironment.buildView(for: components))
                case .text:
                    // HStack shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraUIModifiers(component)
    }
}
