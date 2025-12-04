import SwiftUI

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
    public var callback: (VoltraComponent) -> Void
    public var layout: [VoltraComponent]
    public var activityId: String

    init(layout: [VoltraComponent], callback: @escaping (VoltraComponent) -> Void, activityId: String) {
        self.callback = callback
        self.layout = layout
        self.activityId = activityId
    }

    var body: some View {
        buildView(for: layout)
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
                DynamicButton(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "VStack":
                DynamicVStack(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "HStack":
                DynamicHStack(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "ZStack":
                DynamicZStack(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "List":
                DynamicList(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "ScrollView":
                DynamicScrollView(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "NavigationView":
                DynamicNavigationView(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Form":
                DynamicForm(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Text":
                DynamicText(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Image":
                DynamicImage(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "SymbolView":
                DynamicSymbolView(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Divider":
                DynamicDivider(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Spacer":
                DynamicSpacer(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Label":
                DynamicLabel(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "TextField":
                DynamicTextField(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "SecureField":
                DynamicSecureField(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "TextEditor":
                DynamicTextEditor(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Toggle":
                DynamicToggle(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Gauge":
                DynamicGauge(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "ProgressView":
                DynamicProgressView(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Slider":
                DynamicSlider(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Timer":
                DynamicTimer(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "GroupBox":
                DynamicGroupBox(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "DisclosureGroup":
                DynamicDisclosureGroup(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "HSplitView":
                DynamicHSplitView(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "VSplitView":
                DynamicVSplitView(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "Picker":
                DynamicPicker(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "LinearGradient":
                DynamicLinearGradient(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "GlassContainer":
                DynamicGlassContainer(component)
                    .environment(\.internalVoltraEnvironment, self)

            case "GlassView":
                DynamicGlassView(component)
                    .environment(\.internalVoltraEnvironment, self)

            // NavigationSplitView
            // TabView

            default:
                EmptyView()
            }
        }
    }
}

private struct InternalVoltraKey: EnvironmentKey {
    static let defaultValue: InternalVoltra = InternalVoltra(layout: [], callback: { _ in }, activityId: "")
}

extension EnvironmentValues {
    var internalVoltraEnvironment: InternalVoltra {
        get { self[InternalVoltraKey.self] }
        set { self[InternalVoltraKey.self] = newValue }
    }
}
