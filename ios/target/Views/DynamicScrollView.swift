//
//  DynamicScrollView.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicScrollView: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    private var params: ScrollViewParameters? {
        component.parameters(ScrollViewParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    private var axes: Axis.Set {
        switch params?.axis?.lowercased() {
        case "horizontal": return .horizontal
        case "vertical": return .vertical
        case "both": return [.horizontal, .vertical]
        default: return .vertical
        }
    }

    public var body: some View {
        ScrollView(axes, showsIndicators: params?.showsIndicators ?? true) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraUIEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraUIEnvironment.buildView(for: components))
                case .text:
                    // ScrollView shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraUIModifiers(component)
    }
}
