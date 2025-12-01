//
//  DynamicDisclosureGroup.swift
//  VoltraUI
//
//  Created by Wesley de Groot on 19/04/2024.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI

public struct DynamicDisclosureGroup: View {
    @Environment(\.internalVoltraUIEnvironment)
    private var voltraUIEnvironment

    @State
    private var isExpanded: Bool

    private let component: VoltraUIComponent

    private var params: DisclosureGroupParameters? {
        component.parameters(DisclosureGroupParameters.self)
    }

    public init(_ component: VoltraUIComponent) {
        self.component = component
        let params = component.parameters(DisclosureGroupParameters.self)
        _isExpanded = State(initialValue: params?.isExpanded ?? false)
    }

    public var body: some View {
#if !os(tvOS) && !os(watchOS)
        DisclosureGroup("\(component.props?["title"] as? String ?? "")", isExpanded: $isExpanded) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraUIEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraUIEnvironment.buildView(for: components))
                case .text:
                    // DisclosureGroup shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraUIModifiers(component)
#else
        DynamicVStack(component)
#endif
    }
}
