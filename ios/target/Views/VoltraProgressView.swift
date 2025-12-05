import SwiftUI

public struct VoltraProgressView: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(ProgressViewParameters.self)
        // Prefer standardized time-driven parameters when available
        let endAtMs = params.endAtMs ?? params.timerEndDateInMilliseconds // back-compat
        let startAtMs = params.startAtMs
        let mode = params.mode?.lowercased() ?? "bar"

        if let timeRange = VoltraProgressDriver.resolveRange(startAtMs: startAtMs, endAtMs: endAtMs, durationMs: nil) {
            if #available(macOS 13.0, iOS 16.0, *) {
                let view = ProgressView(timerInterval: timeRange)

                if mode == "circular" {
                    view
                        .progressViewStyle(CircularProgressViewStyle())
                        .voltraModifiers(component)
                } else {
                    view
                        .progressViewStyle(LinearProgressViewStyle())
                        .voltraModifiers(component)
                }
            } else {
                // Fallback: static determinate progress
                if mode == "circular" {
                    ProgressView(
                        "\(component.props?["title"] as? String ?? "")",
                        value: params.defaultValue ?? 0,
                        total: params.maximumValue ?? 100
                    )
                    .progressViewStyle(CircularProgressViewStyle())
                    .voltraModifiers(component)
                } else {
                    ProgressView(
                        "\(component.props?["title"] as? String ?? "")",
                        value: params.defaultValue ?? 0,
                        total: params.maximumValue ?? 100
                    )
                    .progressViewStyle(LinearProgressViewStyle())
                    .voltraModifiers(component)
                }
            }
        } else {
            // Static mode only
            if mode == "circular" {
                ProgressView(
                    "\(component.props?["title"] as? String ?? "")",
                    value: params.defaultValue ?? 0,
                    total: params.maximumValue ?? 100
                )
                .progressViewStyle(CircularProgressViewStyle())
                .voltraModifiers(component)
            } else {
                ProgressView(
                    "\(component.props?["title"] as? String ?? "")",
                    value: params.defaultValue ?? 0,
                    total: params.maximumValue ?? 100
                )
                .progressViewStyle(LinearProgressViewStyle())
                .voltraModifiers(component)
            }
        }
    }
}
