//
//  DynamicGlassContainer.swift
//  Voltra
//
//  Created by Voltra.
//

import SwiftUI

/// Voltra: GlassContainer (iOS 18+)
///
/// Wraps child views in a GlassEffectContainer so any child that applies `.glassEffect` will be
/// composed as a unified "liquid" surface. On iOS < 26, this simply renders the children.
public struct DynamicGlassContainer: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: GlassContainerParameters? {
        component.parameters(GlassContainerParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        Group {
            if let children = component.children {
                switch children {
                case .component(let component):
                    if #available(iOS 26.0, *) {
                        let spacing = params?.spacing ?? 0.0
                        GlassEffectContainer(spacing: CGFloat(spacing)) {
                            AnyView(voltraEnvironment.buildView(for: [component]))
                        }
                    } else {
                        AnyView(voltraEnvironment.buildView(for: [component]))
                    }
                case .components(let components):
                    if !components.isEmpty {
                        if #available(iOS 26.0, *) {
                            let spacing = params?.spacing ?? 0.0
                            GlassEffectContainer(spacing: CGFloat(spacing)) {
                                AnyView(voltraEnvironment.buildView(for: components))
                            }
                        } else {
                            AnyView(voltraEnvironment.buildView(for: components))
                        }
                    } else {
                        EmptyView()
                    }
                case .text:
                    // GlassContainer shouldn't have text children, ignore
                    EmptyView()
                }
            } else {
                EmptyView()
            }
        }
        .voltraModifiers(component)
    }
}
