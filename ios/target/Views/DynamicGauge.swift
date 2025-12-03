import SwiftUI

public struct DynamicGauge: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: GaugeParameters? {
        component.parameters(GaugeParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    private var showValueLabel: Bool {
        if let explicit = params?.showValueLabel {
            return explicit
        }
        if let hide = params?.hideValueLabel {
            return !hide
        }
        return true
    }

    @ViewBuilder
    private func gaugeLabelView() -> some View {
        if let title = component.props?["title"] as? String, !title.isEmpty {
            Text(title)
        }
    }

    @ViewBuilder
    private func valueLabelView(for progress: Double) -> some View {
        if showValueLabel {
            Text(formattedPercentage(progress))
                .monospacedDigit()
        }
    }

    @ViewBuilder
    private func renderGauge(progress: Double) -> some View {
        Gauge(value: max(0, min(progress, 1))) {
            gaugeLabelView()
        } currentValueLabel: {
            valueLabelView(for: progress)
        }
        .voltraModifiers(component)
    }

    private func formattedPercentage(_ progress: Double) -> String {
        let percent = max(0, min(progress, 1)) * 100
        let number = NSNumber(value: percent)
        return Self.percentFormatter.string(from: number) ?? String(format: "%.0f%%", percent)
    }

    private static let percentFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        return formatter
    }()

    /// Generated body for SwiftUI
    public var body: some View {
#if !os(tvOS)
        if #available(macOS 13.0, iOS 16.0, *) {
            // Standardized time-driven props
            let endAtMs = params?.endAtMs
            let startAtMs = params?.startAtMs

            if let range = VoltraProgressDriver.resolveRange(startAtMs: startAtMs, endAtMs: endAtMs, durationMs: nil) {
                TimelineView(.animation) { timeline in
                    let progress = VoltraProgressDriver.progress(for: range, at: timeline.date)
                    renderGauge(progress: progress)
                }
            } else {
                let value = params?.defaultValue ?? 0
                renderGauge(progress: value)
            }
        } else {
            EmptyView()
        }
#else
        EmptyView()
#endif
    }
}
