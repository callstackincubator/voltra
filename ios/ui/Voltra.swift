import SwiftUI

struct VoltraEnvironment {
    /// Callback for node state changes
    let callback: (VoltraNode) -> Void
    
    /// Activity ID for Live Activity interactions
    let activityId: String
}

public struct Voltra: View {
    /// VoltraNode state change handler
    public typealias Handler = (VoltraNode) -> Void

    /// Pre-parsed nodes
    public var nodes: [VoltraNode]

    /// Callback handler for updates
    public var callback: Handler? = { _ in }

    /// Activity ID for Live Activity interactions
    public var activityId: String

    /// Initialize Voltra
    ///
    /// - Parameter nodes: Pre-parsed array of VoltraNode
    /// - Parameter callback: Handler for node interactions
    /// - Parameter activityId: Activity ID for Live Activity interactions
    public init(nodes: [VoltraNode], callback: Handler?, activityId: String) {
        self.nodes = nodes
        self.callback = callback
        self.activityId = activityId
    }

    /// Generated body for SwiftUI
    public var body: some View {
        VoltraChildrenView(nodes: nodes)
            .environment(\.voltraEnvironment, VoltraEnvironment(
                callback: callback ?? { _ in },
                activityId: activityId
            ))
    }
}

/// Renders an array of VoltraNodes using ForEach with stable identity
public struct VoltraChildrenView: View {
    public let nodes: [VoltraNode]
    
    public init(nodes: [VoltraNode]) {
        self.nodes = nodes
    }
    
    /// Convenience initializer that extracts children from a node
    public init(node: VoltraNode) {
        if let children = node.children {
            switch children {
            case .node(let childNode):
                self.nodes = [childNode]
            case .nodes(let childNodes):
                self.nodes = childNodes
            case .text:
                self.nodes = []
            }
        } else {
            self.nodes = []
        }
    }
    
    /// Convenience initializer for VoltraChildren enum
    public init?(children: VoltraChildren?) {
        guard let children = children else { return nil }
        switch children {
        case .node(let node):
            self.nodes = [node]
        case .nodes(let nodes):
            self.nodes = nodes
        case .text:
            return nil
        }
    }
    
    public var body: some View {
        // Use stable identifiers for SwiftUI identity to avoid flicker on updates.
        // Prefer the provided node.id; fall back to array index when absent.
        let items: [(id: String, node: VoltraNode)] = nodes.enumerated().map { (offset, node) in
            (node.id ?? "idx_\(offset)", node)
        }
        ForEach(items, id: \.id) { item in
            VoltraChildView(node: item.node)
        }
    }
}

public struct VoltraChildView: View {
    public let node: VoltraNode
    
    public init(node: VoltraNode) {
        self.node = node
    }
    
    public var body: some View {
        nodeView
            .id(node.id)
    }
    
    // swiftlint:disable:next cyclomatic_complexity function_body_length
    @ViewBuilder
    private var nodeView: some View {
        switch node.type {
        case "Button":
            VoltraButton(node)

        case "VStack":
            VoltraVStack(node)

        case "HStack":
            VoltraHStack(node)

        case "ZStack":
            VoltraZStack(node)

        case "Text":
            VoltraText(node)

        case "Image":
            VoltraImage(node)

        case "Symbol":
            VoltraSymbol(node)

        case "Divider":
            VoltraDivider(node)

        case "Spacer":
            VoltraSpacer(node)

        case "Label":
            VoltraLabel(node)

        case "Toggle":
            VoltraToggle(node)

        case "Gauge":
            VoltraGauge(node)

        case "LinearProgressView":
            VoltraLinearProgressView(node)

        case "CircularProgressView":
            VoltraCircularProgressView(node)

        case "Timer":
            VoltraTimer(node)

        case "GroupBox":
            VoltraGroupBox(node)

        case "LinearGradient":
            VoltraLinearGradient(node)

        case "GlassContainer":
            VoltraGlassContainer(node)

        case "Mask":
            VoltraMask(node)

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
