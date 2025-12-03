//
//  DynamicGlassView.swift
//  Voltra
//
//  Created by Voltra.
//

import SwiftUI

/// Voltra: GlassView (iOS 26+ preferred, but renders content on lower OSes)
///
/// Renders its children and applies ordered modifiers (including `glassEffect`) to the wrapper.
public struct DynamicGlassView: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: GlassViewParameters? {
        component.parameters(GlassViewParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        // Render a clear surface that receives the glassEffect/shape modifiers,
        // then overlay children so content remains visible above the glass.
        Group {
            Color.clear
        }
        .voltraModifiers(component)
        .overlay {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    if !components.isEmpty {
                        AnyView(voltraEnvironment.buildView(for: components))
                    }
                case .text:
                    // GlassView shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
    }
}
