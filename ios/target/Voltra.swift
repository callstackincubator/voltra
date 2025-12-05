import SwiftUI

/// Environment values needed by Voltra views
struct VoltraEnvironment {
    /// Build views for child components recursively
    let buildView: ([VoltraComponent]) -> AnyView
    
    /// Callback for component state changes
    let callback: (VoltraComponent) -> Void
    
    /// Activity ID for Live Activity interactions
    let activityId: String
}

/// Voltra
///
/// Voltra is a SwiftUI View that can be used to display an interface based on VoltraComponents.
public struct Voltra: View {
    /// VoltraComponent state change handler
    public typealias Handler = (VoltraComponent) -> Void

    /// Pre-parsed components
    public var components: [VoltraComponent]

    /// Callback handler for updates
    public var callback: Handler? = { _ in }

    /// Activity ID for Live Activity interactions
    public var activityId: String

    /// Initialize Voltra
    ///
    /// - Parameter components: Pre-parsed array of VoltraComponent
    /// - Parameter callback: Handler for component interactions
    /// - Parameter activityId: Activity ID for Live Activity interactions
    public init(components: [VoltraComponent], callback: Handler?, activityId: String) {
        self.components = components
        self.callback = callback
        self.activityId = activityId
    }

    /// Generated body for SwiftUI
    public var body: some View {
        AnyView(
            InternalVoltra(
                layout: components,
                callback: callback ?? { _ in },
                activityId: activityId
            )
        )
    }
}

struct InternalVoltra: View {
    let callback: (VoltraComponent) -> Void
    let activityId: String
    let layout: [VoltraComponent]  // Private, only for initial render

    init(layout: [VoltraComponent], callback: @escaping (VoltraComponent) -> Void, activityId: String) {
        self.callback = callback
        self.activityId = activityId
        self.layout = layout
    }

    var body: some View {
        buildView(for: layout)
            .environment(\.voltraEnvironment, createEnvironment())
    }
    
    // Create the environment struct
    private func createEnvironment() -> VoltraEnvironment {
        VoltraEnvironment(
            buildView: { components in
                AnyView(self.buildView(for: components))
            },
            callback: callback,
            activityId: activityId
        )
    }

    /// Build a SwiftUI View based on the components
    /// - Parameter components: [UIComponent]
    /// - Returns: A SwiftUI View
    func buildView(for components: [VoltraComponent]) -> some View {
        // swiftlint:disable:previous cyclomatic_complexity function_body_length
        // Use stable identifiers for SwiftUI identity to avoid flicker on updates.
        // Prefer the provided component.id; fall back to array index when absent.
        let items: [(id: String, component: VoltraComponent)] = components.enumerated().map { (offset, comp) in
            (comp.id ?? "idx_\(offset)", comp)
        }
        return ForEach(items, id: \.id) { item in
            let component = item.component
            switch component.type {
            case "Button":
                VoltraButton(component)

            case "VStack":
                VoltraVStack(component)

            case "HStack":
                VoltraHStack(component)

            case "ZStack":
                VoltraZStack(component)

            case "List":
                VoltraList(component)

            case "ScrollView":
                VoltraScrollView(component)

            case "NavigationView":
                VoltraNavigationView(component)

            case "Form":
                VoltraForm(component)

            case "Text":
                VoltraText(component)

            case "Image":
                VoltraImage(component)

            case "Symbol":
                VoltraSymbol(component)

            case "Divider":
                VoltraDivider(component)

            case "Spacer":
                VoltraSpacer(component)

            case "Label":
                VoltraLabel(component)

            case "TextField":
                VoltraTextField(component)

            case "SecureField":
                VoltraSecureField(component)

            case "TextEditor":
                VoltraTextEditor(component)

            case "Toggle":
                VoltraToggle(component)

            case "Gauge":
                VoltraGauge(component)

            case "ProgressView":
                VoltraProgressView(component)

            case "Slider":
                VoltraSlider(component)

            case "Timer":
                VoltraTimer(component)

            case "GroupBox":
                VoltraGroupBox(component)

            case "DisclosureGroup":
                VoltraDisclosureGroup(component)

            case "HSplitView":
                VoltraHSplitView(component)

            case "VSplitView":
                VoltraVSplitView(component)

            case "Picker":
                VoltraPicker(component)

            case "LinearGradient":
                VoltraLinearGradient(component)

            case "GlassContainer":
                VoltraGlassContainer(component)

            case "GlassView":
                VoltraGlassView(component)

            // NavigationSplitView
            // TabView

            default:
                EmptyView()
            }
        }
    }
}

private struct VoltraEnvironmentKey: EnvironmentKey {
    static let defaultValue: VoltraEnvironment = VoltraEnvironment(
        buildView: { _ in AnyView(EmptyView()) },
        callback: { _ in },
        activityId: ""
    )
}

extension EnvironmentValues {
    var voltraEnvironment: VoltraEnvironment {
        get { self[VoltraEnvironmentKey.self] }
        set { self[VoltraEnvironmentKey.self] = newValue }
    }
}
