import SwiftUI

struct VoltraEnvironment {
    /// Callback for component state changes
    let callback: (VoltraComponent) -> Void
    
    /// Activity ID for Live Activity interactions
    let activityId: String
}

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
        VoltraChildrenView(components: components)
            .environment(\.voltraEnvironment, VoltraEnvironment(
                callback: callback ?? { _ in },
                activityId: activityId
            ))
    }
}

/// Renders an array of VoltraComponents using ForEach with stable identity
public struct VoltraChildrenView: View {
    public let components: [VoltraComponent]
    
    public init(components: [VoltraComponent]) {
        self.components = components
    }
    
    /// Convenience initializer that extracts children from a component
    public init(component: VoltraComponent) {
        if let children = component.children {
            switch children {
            case .component(let childComponent):
                self.components = [childComponent]
            case .components(let childComponents):
                self.components = childComponents
            case .text:
                self.components = []
            }
        } else {
            self.components = []
        }
    }
    
    /// Convenience initializer for VoltraChildren enum
    public init?(children: VoltraChildren?) {
        guard let children = children else { return nil }
        switch children {
        case .component(let component):
            self.components = [component]
        case .components(let components):
            self.components = components
        case .text:
            return nil
        }
    }
    
    public var body: some View {
        // Use stable identifiers for SwiftUI identity to avoid flicker on updates.
        // Prefer the provided component.id; fall back to array index when absent.
        let items: [(id: String, component: VoltraComponent)] = components.enumerated().map { (offset, comp) in
            (comp.id ?? "idx_\(offset)", comp)
        }
        ForEach(items, id: \.id) { item in
            VoltraChildView(component: item.component)
        }
    }
}

public struct VoltraChildView: View {
    public let component: VoltraComponent
    
    public init(component: VoltraComponent) {
        self.component = component
    }
    
    public var body: some View {
        componentView
            .id(component.id)
    }
    
    // swiftlint:disable:next cyclomatic_complexity function_body_length
    @ViewBuilder
    private var componentView: some View {
        switch component.type {
        case "Button":
            VoltraButton(component)

        case "VStack":
            VoltraVStack(component)

        case "HStack":
            VoltraHStack(component)

        case "ZStack":
            VoltraZStack(component)

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

        case "Toggle":
            VoltraToggle(component)

        case "Gauge":
            VoltraGauge(component)

        case "LinearProgressView":
            VoltraLinearProgressView(component)

        case "CircularProgressView":
            VoltraCircularProgressView(component)

        case "Timer":
            VoltraTimer(component)

        case "GroupBox":
            VoltraGroupBox(component)

        case "LinearGradient":
            VoltraLinearGradient(component)

        case "GlassContainer":
            VoltraGlassContainer(component)

        case "GlassView":
            VoltraGlassView(component)
            
        case "Mask":
            VoltraMask(component)

        default:
            EmptyView()
        }
    }
}

private struct VoltraEnvironmentKey: EnvironmentKey {
    static let defaultValue: VoltraEnvironment = VoltraEnvironment(
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
