import SwiftUI

struct VoltraEnvironment {
    /// Callback for node state changes
    let callback: (VoltraElement) -> Void
    
    /// Activity ID for Live Activity interactions
    let activityId: String
}

public struct Voltra: View {
    /// VoltraElement state change handler
    public typealias Handler = (VoltraElement) -> Void

    /// Pre-parsed root node
    public var root: VoltraNode

    /// Callback handler for updates
    public var callback: Handler? = { _ in }

    /// Activity ID for Live Activity interactions
    public var activityId: String

    /// Initialize Voltra
    ///
    /// - Parameter root: Pre-parsed root VoltraNode
    /// - Parameter callback: Handler for element interactions
    /// - Parameter activityId: Activity ID for Live Activity interactions
    public init(root: VoltraNode, callback: Handler?, activityId: String) {
        self.root = root
        self.callback = callback
        self.activityId = activityId
    }

    /// Generated body for SwiftUI
    public var body: some View {
        root
            .environment(\.voltraEnvironment, VoltraEnvironment(
                callback: callback ?? { _ in },
                activityId: activityId
            ))
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
