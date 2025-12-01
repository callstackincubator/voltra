//
//
//  VoltraUI.swift
//  VoltraUI
//
//  Created by Saul Sharma.
//  https://x.com/saul_sharma
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import SwiftUI
// Import shared types

/// VoltraUI
///
/// VoltraUI is a SwiftUI View that can be used to display an interface based on VoltraUIComponents.
public struct VoltraUI: View {
    /// VoltraUIComponent state change handler
    public typealias Handler = (VoltraUIComponent) -> Void

    /// Pre-parsed components
    public var components: [VoltraUIComponent]

    /// Callback handler for updates
    public var callback: Handler? = { _ in }

    /// Initialize VoltraUI
    ///
    /// - Parameter components: Pre-parsed array of VoltraUIComponent
    public init(components: [VoltraUIComponent], callback: Handler?) {
        self.components = components
        self.callback = callback
    }

    /// Generated body for SwiftUI
    public var body: some View {
        AnyView(
            InternalVoltraUI(
                layout: components,
                callback: callback ?? { _ in }
            )
        )
    }
}

struct InternalVoltraUI: View {
    public var callback: (VoltraUIComponent) -> Void
    public var layout: [VoltraUIComponent]

    init(layout: [VoltraUIComponent], callback: @escaping (VoltraUIComponent) -> Void) {
        self.callback = callback
        self.layout = layout
    }

    var body: some View {
        buildView(for: layout)
    }

    /// Build a SwiftUI View based on the components
    /// - Parameter components: [UIComponent]
    /// - Returns: A SwiftUI View
    func buildView(for components: [VoltraUIComponent]) -> some View {
        // swiftlint:disable:previous cyclomatic_complexity function_body_length
        // Use stable identifiers for SwiftUI identity to avoid flicker on updates.
        // Prefer the provided component.id; fall back to array index when absent.
        let items: [(id: String, component: VoltraUIComponent)] = components.enumerated().map { (offset, comp) in
            (comp.id ?? "idx_\(offset)", comp)
        }
        return ForEach(items, id: \.id) { item in
            let component = item.component
            switch component.type {
            case "Button":
                DynamicButton(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "VStack":
                DynamicVStack(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "HStack":
                DynamicHStack(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "ZStack":
                DynamicZStack(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "List":
                DynamicList(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "ScrollView":
                DynamicScrollView(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "NavigationView":
                DynamicNavigationView(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Form":
                DynamicForm(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Text":
                DynamicText(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Image":
                DynamicImage(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "SymbolView":
                DynamicSymbolView(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Divider":
                DynamicDivider(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Spacer":
                DynamicSpacer(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Label":
                DynamicLabel(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "TextField":
                DynamicTextField(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "SecureField":
                DynamicSecureField(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "TextEditor":
                DynamicTextEditor(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Toggle":
                DynamicToggle(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Gauge":
                DynamicGauge(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "ProgressView":
                DynamicProgressView(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Slider":
                DynamicSlider(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Timer":
                DynamicTimer(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "GroupBox":
                DynamicGroupBox(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "DisclosureGroup":
                DynamicDisclosureGroup(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "HSplitView":
                DynamicHSplitView(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "VSplitView":
                DynamicVSplitView(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "Picker":
                DynamicPicker(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "LinearGradient":
                DynamicLinearGradient(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "GlassContainer":
                DynamicGlassContainer(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            case "GlassView":
                DynamicGlassView(component)
                    .environment(\.internalVoltraUIEnvironment, self)

            // NavigationSplitView
            // TabView

            default:
                EmptyView()
            }
        }
    }
}

private struct InternalVoltraUIKey: EnvironmentKey {
    static let defaultValue: InternalVoltraUI = InternalVoltraUI(layout: [], callback: { _ in })
}

extension EnvironmentValues {
    var internalVoltraUIEnvironment: InternalVoltraUI {
        get { self[InternalVoltraUIKey.self] }
        set { self[InternalVoltraUIKey.self] = newValue }
    }
}
