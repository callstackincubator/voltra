//
//  DynamicGlassView.swift
//  VoltraUI
//
//  Created by Voltra.
//

import SwiftUI

/// VoltraUI: GlassView (iOS 26+ preferred, but renders content on lower OSes)
///
/// Renders its children and applies ordered modifiers (including `glassEffect`) to the wrapper.
public struct DynamicGlassView: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    private let component: VoltraUIComponent

    private var params: GlassViewParameters? {
        component.parameters(GlassViewParameters.self)
    }

    init(_ component: VoltraUIComponent) {
        self.component = component
    }

    public var body: some View {
        // Render a clear surface that receives the glassEffect/shape modifiers,
        // then overlay children so content remains visible above the glass.
        Group {
            Color.clear
        }
        .voltraUIModifiers(component)
        .overlay {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraUIEnvironment.buildView(for: [component]))
                case .components(let components):
                    if !components.isEmpty {
                        AnyView(voltraUIEnvironment.buildView(for: components))
                    }
                case .text:
                    // GlassView shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
    }
}
