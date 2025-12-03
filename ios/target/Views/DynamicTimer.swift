//
//  DynamicTimer.swift
//  Voltra
//
//  Flexible countdown/stopwatch view backed by SwiftUI system timer renderers.
//

import SwiftUI

public struct DynamicTimer: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent
    private let helper = VoltraHelper()

    private var params: TimerParameters? {
        component.parameters(TimerParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    // Helpers to read parameters
    private var endAtMs: Double? { params?.endAtMs }
    private var startAtMs: Double? { params?.startAtMs }
    private var durationMs: Double? { params?.durationMs }
    private var progressRange: ClosedRange<Date>? {
        VoltraProgressDriver.resolveRange(
            startAtMs: startAtMs,
            endAtMs: endAtMs,
            durationMs: durationMs
        )
    }
    private var resolvedStartDate: Date? { progressRange?.lowerBound }
    private var resolvedEndDate: Date? { progressRange?.upperBound }
    private var mode: String {
        params?.mode?.lowercased() ?? "text"
    }
    private var direction: String {
        params?.direction?.lowercased() ?? "down"
    }
    private var countsDown: Bool { direction != "up" }
    private var textStyle: String {
        params?.textStyle?.lowercased() ?? "timer"
    }
    private var autoHideOnEnd: Bool {
        params?.autoHideOnEnd ?? false
    }

    private struct TextTemplates: Codable {
        let running: String?
        let completed: String?
    }

    private var textTemplates: TextTemplates? {
        guard let raw = params?.textTemplates,
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(TextTemplates.self, from: data)
    }

    private var modeOrderedModifiers: [String: [VoltraModifier]] {
        guard let raw = params?.modeOrderedModifiers,
              let data = raw.data(using: .utf8) else { return [:] }

        do {
            let decoded = try JSONDecoder().decode([String: [VoltraModifier]].self, from: data)
            var lowered: [String: [VoltraModifier]] = [:]
            for (key, value) in decoded {
                lowered[key.lowercased()] = value
            }
            return lowered
        } catch {
            return [:]
        }
    }

    private var modeTrackColors: [String: Color] {
        guard let raw = params?.modeTrackColors,
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }

        var lowered: [String: Color] = [:]
        for (key, value) in decoded {
            if let color = helper.translateColor(value) {
                lowered[key.lowercased()] = color
            }
        }
        return lowered
    }

    private var modeTintColors: [String: Color] {
        guard let raw = params?.modeTintColors,
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }

        var lowered: [String: Color] = [:]
        for (key, value) in decoded {
            if let color = helper.translateColor(value) {
                lowered[key.lowercased()] = color
            }
        }
        return lowered
    }

    private func mergedModifiers(for variantKey: String?) -> [VoltraModifier] {
        var result: [VoltraModifier] = []
        if let base = component.modifiers {
            result.append(contentsOf: base)
        }
        if let defaults = modeOrderedModifiers["default"] {
            result.append(contentsOf: defaults)
        }
        if let key = variantKey?.lowercased(), key != "default", let extras = modeOrderedModifiers[key] {
            result.append(contentsOf: extras)
        }
        return result
    }

    private func resolvedCornerRadius(for variantKey: String?) -> CGFloat? {
        for modifier in mergedModifiers(for: variantKey).reversed() {
            if modifier.name == "cornerRadius" {
                if let radius = modifier.args?["radius"]?.toDouble() {
                    return CGFloat(radius)
                }
                if let radiusInt = modifier.args?["radius"]?.toInt() {
                    return CGFloat(radiusInt)
                }
            }
        }
        return nil
    }

    private func resolvedFrameHeight(for variantKey: String?) -> CGFloat? {
        for modifier in mergedModifiers(for: variantKey).reversed() {
            if modifier.name == "frame" {
                if let height = modifier.args?["height"]?.toDouble() {
                    return CGFloat(height)
                }
                if let heightInt = modifier.args?["height"]?.toInt() {
                    return CGFloat(heightInt)
                }
            }
        }
        return nil
    }

    private func resolvedTintColor(for variantKey: String?) -> Color? {
        for modifier in mergedModifiers(for: variantKey).reversed() {
            if modifier.name == "tint", let colorName = modifier.args?["color"]?.toString(), let color = helper.translateColor(colorName) {
                return color
            }
        }

        return nil
    }

    private func finalTintColor(for variantKey: String?) -> Color? {
        if let key = variantKey?.lowercased(), let color = modeTintColors[key] {
            return color
        }
        if let color = modeTintColors["default"] {
            return color
        }
        if let color = resolvedTintColor(for: variantKey) {
            return color
        }
        return resolvedTintColor(for: nil)
    }

    private func countdownTextView(range: ClosedRange<Date>) -> some View {
        TimelineView(.animation) { context in
            let remaining = range.upperBound.timeIntervalSince(context.date)
            if let text = formattedCountdownText(remaining: remaining) {
                return AnyView(text)
            }
            if remaining > 0 {
                if textStyle == "relative" {
                    return AnyView(Text(range.upperBound, style: .relative))
                } else {
                    return AnyView(Text(range.upperBound, style: .timer).monospacedDigit())
                }
            } else {
                if textStyle == "relative" {
                    return AnyView(Text("0s"))
                } else {
                    return AnyView(Text("0:00").monospacedDigit())
                }
            }
        }
    }

    private func countUpTextView(range: ClosedRange<Date>) -> some View {
        TimelineView(.animation) { context in
            let elapsedRaw = context.date.timeIntervalSince(range.lowerBound)
            let total = range.upperBound.timeIntervalSince(range.lowerBound)
            let elapsed = total > 0 ? min(max(0, elapsedRaw), total) : max(0, elapsedRaw)
            if let text = formattedCountUpText(elapsed: elapsed) {
                return AnyView(text)
            }
            if textStyle == "relative" {
                return AnyView(Text(range.lowerBound, style: .relative))
            } else {
                return AnyView(Text(range.lowerBound, style: .timer).monospacedDigit())
            }
        }
    }

    private func formattedCountdownText(remaining: TimeInterval) -> Text? {
        guard let templates = textTemplates else { return nil }
        let monospaced = textStyle != "relative"
        if remaining > 0 {
            if let template = templates.running {
                let formatted = countdownTimeString(remaining: remaining)
                return renderTemplate(template: template, time: formatted, monospaced: monospaced)
            }
        } else {
            if let template = templates.completed {
                let formatted = countdownTimeString(remaining: 0)
                return renderTemplate(template: template, time: formatted, monospaced: monospaced)
            }
        }
        return nil
    }

    private func formattedCountUpText(elapsed: TimeInterval) -> Text? {
        guard let template = textTemplates?.running else { return nil }
        let formatted = countUpTimeString(elapsed: elapsed)
        let monospaced = textStyle != "relative"
        return renderTemplate(template: template, time: formatted, monospaced: monospaced)
    }

    private func countdownTimeString(remaining: TimeInterval) -> String {
        if textStyle == "relative" {
            if remaining <= 0 { return "0s" }
            return Self.relativeFormatter.localizedString(fromTimeInterval: remaining)
        }
        return Self.timerFormatter.string(from: max(remaining, 0)) ?? "0:00"
    }

    private func countUpTimeString(elapsed: TimeInterval) -> String {
        if textStyle == "relative" {
            return Self.relativeFormatter.localizedString(fromTimeInterval: -elapsed)
        }
        return Self.timerFormatter.string(from: max(elapsed, 0)) ?? "0:00"
    }

    private func renderTemplate(template: String, time: String, monospaced: Bool) -> Text {
        let placeholder = "{time}"
        let segments = template.components(separatedBy: placeholder)
        guard segments.count > 1 else {
            return Text(template)
        }

        var text = Text(verbatim: segments.first ?? "")
        for segment in segments.dropFirst() {
            let timeText = Text(time)
            let formattedTime = monospaced ? timeText.monospacedDigit() : timeText
            text = text + formattedTime
            if !segment.isEmpty {
                text = text + Text(verbatim: segment)
            }
        }

        return text
    }

    private func trackColor(for variantKey: String?) -> Color? {
        if let key = variantKey?.lowercased(), let color = modeTrackColors[key] {
            return color
        }
        return modeTrackColors["default"]
    }

    private func applyModifiers<Content: View>(_ content: Content, variantKey: String?) -> AnyView {
        var view = AnyView(content.voltraModifiers(component))

        if let defaults = modeOrderedModifiers["default"], !defaults.isEmpty {
            view = AnyView(view.voltraModifiers(defaults))
        }

        if let key = variantKey?.lowercased(), let extras = modeOrderedModifiers[key], !extras.isEmpty {
            view = AnyView(view.voltraModifiers(extras))
        }

        return view
    }

    public var body: some View {
#if !os(tvOS)
        if #available(iOS 16.0, macOS 13.0, *) {
            guard let range = progressRange else {
                return AnyView(EmptyView())
            }

            if autoHideOnEnd, let end = resolvedEndDate, Date() >= end {
                return AnyView(EmptyView())
            }

            switch mode {
            case "circular":
                let variantKey = "circular"
                let base = ProgressView(timerInterval: range)
                    .progressViewStyle(.circular)
                var modified = applyModifiers(base, variantKey: variantKey)
                if let tint = finalTintColor(for: variantKey) {
                    modified = AnyView(modified.tint(tint))
                }
                return modified
            case "bar":
                let variantKey = "bar"
                let trackTint = trackColor(for: variantKey)
                let progressTint = finalTintColor(for: variantKey)
                let height = resolvedFrameHeight(for: variantKey) ?? resolvedFrameHeight(for: nil)
                let radius = resolvedCornerRadius(for: variantKey) ?? resolvedCornerRadius(for: nil)

                let progress: AnyView
                if let trackTint = trackTint {
                    let style = DynamicLinearTimerStyle(
                        progressTint: progressTint,
                        trackTint: trackTint,
                        cornerRadius: radius,
                        explicitHeight: height
                    )
                    progress = AnyView(
                        ProgressView(timerInterval: range)
                            .progressViewStyle(style)
                    )
                } else {
                    progress = AnyView(
                        ProgressView(timerInterval: range)
                            .progressViewStyle(.linear)
                    )
                }
                var modified = applyModifiers(progress, variantKey: variantKey)
                if let tint = finalTintColor(for: variantKey) {
                    modified = AnyView(modified.tint(tint))
                }
                return modified
            default:
                if countsDown {
                    let textView = countdownTextView(range: range)
                    return applyModifiers(textView, variantKey: "text")
                } else {
                    let textView = countUpTextView(range: range)
                    return applyModifiers(textView, variantKey: "text")
                }
            }
        } else {
            return AnyView(EmptyView())
        }
#else
        return AnyView(EmptyView())
#endif
    }
}

@available(iOS 16.0, macOS 13.0, *)
private struct DynamicLinearTimerStyle: ProgressViewStyle {
    var progressTint: Color?
    var trackTint: Color
    var cornerRadius: CGFloat?
    var explicitHeight: CGFloat?

    func makeBody(configuration: Configuration) -> some View {
        GeometryReader { geometry in
            let fraction = max(0, min(configuration.fractionCompleted ?? 0, 1))
            let totalWidth = geometry.size.width
            let height = explicitHeight ?? max(geometry.size.height, 4)
            let radius = cornerRadius ?? height / 2
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(trackTint)
                    .frame(width: totalWidth, height: height)
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(progressTint ?? Color.accentColor)
                    .frame(width: totalWidth * CGFloat(fraction), height: height)
            }
        }
        .frame(height: explicitHeight ?? 4)
    }
}

// MARK: - Formatters

extension DynamicTimer {
    private static let timerFormatter: DateComponentsFormatter = {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.minute, .second]
        formatter.zeroFormattingBehavior = [.pad]
        formatter.unitsStyle = .positional
        formatter.maximumUnitCount = 2
        return formatter
    }()

    private static let relativeFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter
    }()
}
